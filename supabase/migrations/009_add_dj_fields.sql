-- Add additional fields to DJs table

-- Add new columns
ALTER TABLE djs ADD COLUMN IF NOT EXISTS dj_code TEXT UNIQUE;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS rate_per_hour DECIMAL(10, 2) DEFAULT 0;

-- Generate DJ codes for existing DJs
UPDATE djs SET dj_code = 'DJ-' || SUBSTRING(id::TEXT, 1, 8) WHERE dj_code IS NULL;

-- Make dj_code required (after populating existing records)
ALTER TABLE djs ALTER COLUMN dj_code SET NOT NULL;
