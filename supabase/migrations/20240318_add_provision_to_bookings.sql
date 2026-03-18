-- Add provision column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS provision NUMERIC(5,2) DEFAULT 0;

-- Update existing bookings to have 0 provision
UPDATE bookings SET provision = 0 WHERE provision IS NULL;
