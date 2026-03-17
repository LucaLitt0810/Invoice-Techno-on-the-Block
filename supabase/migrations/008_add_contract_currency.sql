-- Add currency column to contracts table
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Update existing contracts to have EUR as default
UPDATE contracts
SET currency = 'EUR'
WHERE currency IS NULL;
