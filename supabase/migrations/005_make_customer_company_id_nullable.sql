-- Migration: Make company_id in customers table nullable
-- Customers should not be bound to companies

-- Make company_id nullable
ALTER TABLE customers ALTER COLUMN company_id DROP NOT NULL;
