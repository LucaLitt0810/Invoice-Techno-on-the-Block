-- Add PDF upload columns for contract documents
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nda_pdf TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_desc_pdf TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS data_storage_pdf TEXT;
