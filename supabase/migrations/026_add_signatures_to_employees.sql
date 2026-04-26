-- Add digital signature columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_verein TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_vertragsnehmer TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_ort TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_datum DATE;
