-- Add DJ assignment to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dj_id UUID REFERENCES djs(id) ON DELETE SET NULL;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
