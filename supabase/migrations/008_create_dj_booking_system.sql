-- DJ Booking System Migration
-- Phase 1: Database Schema

-- Create DJs table
CREATE TABLE djs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on DJs
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dj_id UUID NOT NULL REFERENCES djs(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  client_name TEXT,
  fee DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'request' 
    CHECK (status IN ('request', 'negotiation', 'confirmed', 'paid', 'cancelled')),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_bookings_dj_id ON bookings(dj_id);
CREATE INDEX idx_bookings_start_date ON bookings(start_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_djs_user_id ON djs(user_id);

-- RLS Policies for DJs table
CREATE POLICY "Authenticated users can view all DJs"
ON djs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert DJs"
ON djs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update DJs"
ON djs FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete DJs"
ON djs FOR DELETE
USING (auth.role() = 'authenticated');

-- Simple RLS Policies for Bookings (all authenticated users can CRUD)
-- Role-based filtering is handled in the API layer
CREATE POLICY "Authenticated users can view bookings"
ON bookings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bookings"
ON bookings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bookings"
ON bookings FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bookings"
ON bookings FOR DELETE
USING (auth.role() = 'authenticated');

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_dj_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE dj_id = p_dj_id
      AND status NOT IN ('cancelled')
      AND (
        (start_date <= p_start_date AND end_date > p_start_date) OR
        (start_date < p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      )
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent conflicting bookings
CREATE OR REPLACE FUNCTION prevent_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF check_booking_conflict(NEW.dj_id, NEW.start_date, NEW.end_date, NEW.id) THEN
    RAISE EXCEPTION 'Booking conflict detected for this DJ at the specified time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_booking_conflict_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_booking_conflict();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_djs_updated_at
BEFORE UPDATE ON djs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
