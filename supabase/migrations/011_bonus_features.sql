-- Bonus Features: Unavailability & Recurring Events

-- Create DJ unavailability table
CREATE TABLE dj_unavailability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dj_id UUID NOT NULL REFERENCES djs(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  type TEXT DEFAULT 'vacation' CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dj_unavailability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view unavailability"
ON dj_unavailability FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert unavailability"
ON dj_unavailability FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unavailability"
ON dj_unavailability FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unavailability"
ON dj_unavailability FOR DELETE
USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_unavailability_dj_id ON dj_unavailability(dj_id);
CREATE INDEX idx_unavailability_dates ON dj_unavailability(start_date, end_date);

-- Function to check if DJ is available
CREATE OR REPLACE FUNCTION is_dj_available(
  p_dj_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_exclude_unavailability_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM dj_unavailability
    WHERE dj_id = p_dj_id
      AND (
        (start_date <= p_start_date AND end_date > p_start_date) OR
        (start_date < p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      )
      AND (p_exclude_unavailability_id IS NULL OR id != p_exclude_unavailability_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Add recurring event fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;

-- Valid recurrence patterns: 'daily', 'weekly', 'biweekly', 'monthly'
ALTER TABLE bookings ADD CONSTRAINT valid_recurrence_pattern 
  CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly'));

-- Create index for recurring bookings
CREATE INDEX idx_bookings_recurring ON bookings(is_recurring, parent_booking_id);

-- Trigger for recurring bookings
CREATE OR REPLACE FUNCTION generate_recurring_bookings()
RETURNS TRIGGER AS $$
DECLARE
  v_current_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_interval INTERVAL;
  v_new_booking_id UUID;
BEGIN
  -- Only generate if this is the parent booking
  IF NEW.is_recurring AND NEW.parent_booking_id IS NULL AND NEW.recurrence_pattern IS NOT NULL THEN
    v_current_date := NEW.start_date;
    v_end_date := NEW.recurrence_end_date;
    
    -- Set interval based on pattern
    CASE NEW.recurrence_pattern
      WHEN 'daily' THEN v_interval := '1 day'::INTERVAL;
      WHEN 'weekly' THEN v_interval := '1 week'::INTERVAL;
      WHEN 'biweekly' THEN v_interval := '2 weeks'::INTERVAL;
      WHEN 'monthly' THEN v_interval := '1 month'::INTERVAL;
      ELSE v_interval := NULL;
    END CASE;
    
    -- Generate child bookings
    WHILE v_current_date + v_interval < v_end_date LOOP
      v_current_date := v_current_date + v_interval;
      
      INSERT INTO bookings (
        dj_id,
        event_name,
        start_date,
        end_date,
        location,
        client_name,
        fee,
        status,
        notes,
        user_id,
        is_recurring,
        parent_booking_id
      ) VALUES (
        NEW.dj_id,
        NEW.event_name,
        v_current_date,
        v_current_date + (NEW.end_date - NEW.start_date),
        NEW.location,
        NEW.client_name,
        NEW.fee,
        NEW.status,
        NEW.notes || ' (Recurring from ' || NEW.event_name || ')',
        NEW.user_id,
        true,
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_recurring_bookings_trigger
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION generate_recurring_bookings();

-- Update trigger for unavailability
CREATE TRIGGER update_unavailability_updated_at
BEFORE UPDATE ON dj_unavailability
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
