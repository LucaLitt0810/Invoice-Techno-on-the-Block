-- Add consent signature columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS consent_signature_verein TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS consent_signature_vertragsnehmer TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS consent_signature_ort TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS consent_signature_datum DATE;
