-- Fix RLS policies for invoice_sequences
-- The get_next_invoice_number function needs INSERT permission

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can insert own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can update own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can view all invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can insert invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can update invoice_sequences" ON invoice_sequences;

-- Enable RLS (if not already enabled)
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view sequences
CREATE POLICY "Authenticated users can view all invoice_sequences"
ON invoice_sequences FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert sequences (needed for new years)
CREATE POLICY "Authenticated users can insert invoice_sequences"
ON invoice_sequences FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update sequences (needed to increment counter)
CREATE POLICY "Authenticated users can update invoice_sequences"
ON invoice_sequences FOR UPDATE
USING (auth.role() = 'authenticated');
