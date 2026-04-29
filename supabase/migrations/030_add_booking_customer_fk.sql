-- Add foreign key from bookings to customers (needed for Supabase joins)
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE SET NULL;
