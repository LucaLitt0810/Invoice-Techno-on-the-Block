-- Ensure orders table has all required columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- If title was just added, ensure existing rows have a value
UPDATE orders SET title = 'Untitled Order' WHERE title IS NULL;

-- Then make it NOT NULL
ALTER TABLE orders ALTER COLUMN title SET NOT NULL;

-- Same for status
UPDATE orders SET status = 'open' WHERE status IS NULL;
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Ensure policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Allow all access'
  ) THEN
    CREATE POLICY "Allow all access" ON orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
