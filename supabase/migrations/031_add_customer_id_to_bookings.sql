-- Add customer_id column to bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_id UUID;
  END IF;
END
$$;

-- Add foreign key from bookings to customers
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE SET NULL;
