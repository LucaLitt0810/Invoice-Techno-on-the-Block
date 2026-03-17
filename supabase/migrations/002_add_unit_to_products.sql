-- Migration: Add unit field to products and make company_id optional

-- Add unit column to products table with default 'piece'
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece';

-- Make company_id nullable (if not already done)
ALTER TABLE products ALTER COLUMN company_id DROP NOT NULL;

-- Add unit column to invoice_items table (optional - to store unit at time of invoice)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit TEXT;

-- Remove stripe columns from invoices (if still exist)
ALTER TABLE invoices DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS stripe_payment_url;

-- Remove stripe column from payments
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_payment_intent_id;
