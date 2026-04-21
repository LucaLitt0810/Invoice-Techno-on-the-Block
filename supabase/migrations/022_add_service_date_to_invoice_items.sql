-- Add service_date column to invoice_items for per-item service dates
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_date DATE;
