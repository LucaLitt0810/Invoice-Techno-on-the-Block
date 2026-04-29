-- Remove the reverse FK from receipts to transactions to avoid ambiguous relationships
ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_transaction_id_fkey;
