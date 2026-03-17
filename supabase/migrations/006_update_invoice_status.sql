-- Migration: Update invoice status from 'draft' to 'created'

-- Update existing draft invoices to created
UPDATE invoices SET status = 'created' WHERE status = 'draft';

-- Note: The status check constraint needs to be updated if it exists
-- If you get an error, run this first:
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
-- ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('created', 'sent', 'paid', 'overdue', 'cancelled'));
