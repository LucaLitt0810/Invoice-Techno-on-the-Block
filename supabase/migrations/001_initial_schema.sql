-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  email TEXT NOT NULL,
  phone TEXT,
  tax_number TEXT,
  vat_id TEXT,
  bank_name TEXT,
  iban TEXT,
  bic TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  customer_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, customer_number)
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_date DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 19,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  terms TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- Invoice items table
CREATE TABLE invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice number sequence table (for auto-increment per year per company)
CREATE TABLE invoice_sequences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year)
);

-- Row Level Security Policies

-- Companies: Users can only see their own companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Customers: Users can only see customers of their companies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers of own companies" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = customers.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customers to own companies" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = customers.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update customers of own companies" ON customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = customers.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete customers of own companies" ON customers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = customers.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Products: Users can only see products of their companies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products of own companies" ON products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = products.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products to own companies" ON products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = products.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products of own companies" ON products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = products.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products of own companies" ON products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = products.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Invoices: Users can only see invoices of their companies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices of own companies" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoices.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices to own companies" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoices.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices of own companies" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoices.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoices of own companies" ON invoices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoices.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Invoice items: Users can only see items of their invoices
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of own invoices" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = invoice_items.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to own invoices" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = invoice_items.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own invoices" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = invoice_items.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of own invoices" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = invoice_items.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Payments: Users can only see payments of their invoices
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments of own invoices" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = payments.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments to own invoices" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = payments.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments of own invoices" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = payments.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments of own invoices" ON payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      JOIN companies ON companies.id = invoices.company_id
      WHERE invoices.id = payments.invoice_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Invoice sequences: Users can only see sequences of their companies
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequences of own companies" ON invoice_sequences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoice_sequences.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sequences to own companies" ON invoice_sequences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoice_sequences.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sequences of own companies" ON invoice_sequences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = invoice_sequences.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id UUID, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Try to get existing sequence
  SELECT last_number INTO v_last_number
  FROM invoice_sequences
  WHERE company_id = p_company_id AND year = p_year
  FOR UPDATE;
  
  IF v_last_number IS NULL THEN
    -- Create new sequence
    v_new_number := 1;
    INSERT INTO invoice_sequences (company_id, year, last_number)
    VALUES (p_company_id, p_year, v_new_number);
  ELSE
    -- Increment existing sequence
    v_new_number := v_last_number + 1;
    UPDATE invoice_sequences
    SET last_number = v_new_number, updated_at = NOW()
    WHERE company_id = p_company_id AND year = p_year;
  END IF;
  
  RETURN p_year || '-' || LPAD(v_new_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total), 0) 
      FROM invoice_items 
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update totals when items change
CREATE TRIGGER update_invoice_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();

-- Function to calculate tax after subtotal update
CREATE OR REPLACE FUNCTION calculate_invoice_tax()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax := ROUND(NEW.subtotal * (NEW.tax_rate / 100), 2);
  NEW.total := NEW.subtotal + NEW.tax;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate tax on invoice insert/update
CREATE TRIGGER calculate_invoice_tax_trigger
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_tax();

-- Indexes for performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
