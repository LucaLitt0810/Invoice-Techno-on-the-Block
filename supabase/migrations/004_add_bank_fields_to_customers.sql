-- Migration: Add bank payment fields to customers table

-- Add bank fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bic TEXT;
