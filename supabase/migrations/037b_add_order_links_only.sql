-- If orders/offers tables already exist, just add the missing links
-- Add order_id to invoices, contracts, bookings

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_order ON contracts(order_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_order ON bookings(order_id);
