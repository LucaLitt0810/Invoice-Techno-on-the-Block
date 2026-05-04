-- The orders table may have an order_number column with NOT NULL
-- that was created manually or by an earlier attempt.
-- Remove the constraint so our app code works without it.

ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;

-- Or if you prefer to drop the column entirely:
-- ALTER TABLE orders DROP COLUMN IF EXISTS order_number;

NOTIFY pgrst, 'reload schema';
