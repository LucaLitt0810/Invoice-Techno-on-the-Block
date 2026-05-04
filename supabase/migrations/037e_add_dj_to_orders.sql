-- Add DJ reference to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dj_id UUID REFERENCES djs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_dj ON orders(dj_id);

NOTIFY pgrst, 'reload schema';
