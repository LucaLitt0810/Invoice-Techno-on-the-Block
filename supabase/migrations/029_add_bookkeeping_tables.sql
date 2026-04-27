-- Bookkeeping system: categories, receipts, transactions

-- Categories for income and expenses
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO categories (name, type, color) VALUES
  ('Event Revenue', 'income', '#22c55e'),
  ('DJ Booking Revenue', 'income', '#10b981'),
  ('Product Sales', 'income', '#14b8a6'),
  ('Other Income', 'income', '#06b6d4'),
  ('Rent / Venue', 'expense', '#ef4444'),
  ('Marketing / Advertising', 'expense', '#f97316'),
  ('Equipment', 'expense', '#f59e0b'),
  ('Travel / Transport', 'expense', '#eab308'),
  ('Food / Catering', 'expense', '#84cc16'),
  ('Insurance', 'expense', '#10b981'),
  ('Salary / Wages', 'expense', '#06b6d4'),
  ('Office Supplies', 'expense', '#3b82f6'),
  ('Utilities', 'expense', '#6366f1'),
  ('Legal / Accounting', 'expense', '#8b5cf6'),
  ('Other Expense', 'expense', '#a855f7')
ON CONFLICT DO NOTHING;

-- Receipts / Belege
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_data TEXT,              -- Base64 PDF/image data
  file_name TEXT,
  extracted_date DATE,
  extracted_amount DECIMAL(10,2),
  extracted_vendor TEXT,
  manual_date DATE,
  manual_amount DECIMAL(10,2),
  manual_vendor TEXT,
  notes TEXT,
  status TEXT DEFAULT 'unprocessed' CHECK (status IN ('unprocessed', 'reviewed', 'assigned')),
  transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions / Buchungen
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  receipt_id UUID REFERENCES receipts(id),
  invoice_id UUID REFERENCES invoices(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key from receipts to transactions after both tables exist
ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_transaction_id_fkey;
ALTER TABLE receipts
  ADD CONSTRAINT receipts_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
  ON DELETE SET NULL;

-- RLS policies (shared data pattern)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all access" ON receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all access" ON transactions FOR ALL USING (true) WITH CHECK (true);
