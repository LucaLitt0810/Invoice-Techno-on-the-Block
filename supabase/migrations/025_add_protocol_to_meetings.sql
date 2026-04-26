-- Add protocol column to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS protocol TEXT;
