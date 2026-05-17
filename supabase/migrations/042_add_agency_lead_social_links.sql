-- Add website and instagram columns to agency_leads
ALTER TABLE agency_leads
ADD COLUMN website TEXT,
ADD COLUMN instagram TEXT;
