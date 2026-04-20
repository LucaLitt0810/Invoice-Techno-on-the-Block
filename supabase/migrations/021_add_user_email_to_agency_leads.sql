-- Add user_email column to agency_leads for creator attribution display
ALTER TABLE agency_leads ADD COLUMN IF NOT EXISTS user_email TEXT;
