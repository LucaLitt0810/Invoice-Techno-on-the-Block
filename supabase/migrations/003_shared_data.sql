-- Update RLS policies to allow all authenticated users to access all data
-- This makes the app multi-user with shared data instead of multi-tenant

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;

DROP POLICY IF EXISTS "Users can view customers of own companies" ON customers;
DROP POLICY IF EXISTS "Users can insert customers to own companies" ON customers;
DROP POLICY IF EXISTS "Users can update customers of own companies" ON customers;
DROP POLICY IF EXISTS "Users can delete customers of own companies" ON customers;

DROP POLICY IF EXISTS "Users can view products of own companies" ON products;
DROP POLICY IF EXISTS "Users can insert products to own companies" ON products;
DROP POLICY IF EXISTS "Users can update products of own companies" ON products;
DROP POLICY IF EXISTS "Users can delete products of own companies" ON products;

DROP POLICY IF EXISTS "Users can view invoices of own companies" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices to own companies" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices of own companies" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices of own companies" ON invoices;

DROP POLICY IF EXISTS "Users can view items of own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert items to own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can update items of own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete items of own invoices" ON invoice_items;

DROP POLICY IF EXISTS "Users can view payments of own invoices" ON payments;
DROP POLICY IF EXISTS "Users can insert payments to own invoices" ON payments;
DROP POLICY IF EXISTS "Users can update payments of own invoices" ON payments;
DROP POLICY IF EXISTS "Users can delete payments of own invoices" ON payments;

DROP POLICY IF EXISTS "Users can view sequences of own companies" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can insert sequences to own companies" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can update sequences of own companies" ON invoice_sequences;

-- Create new policies for shared access (all authenticated users)

-- Companies: All authenticated users can access all companies
CREATE POLICY "All users can view companies" ON companies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert companies" ON companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update companies" ON companies
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete companies" ON companies
  FOR DELETE USING (auth.role() = 'authenticated');

-- Customers: All authenticated users can access all customers
CREATE POLICY "All users can view customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete customers" ON customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Products: All authenticated users can access all products
CREATE POLICY "All users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete products" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Invoices: All authenticated users can access all invoices
CREATE POLICY "All users can view invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete invoices" ON invoices
  FOR DELETE USING (auth.role() = 'authenticated');

-- Invoice items: All authenticated users can access all items
CREATE POLICY "All users can view invoice items" ON invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert invoice items" ON invoice_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update invoice items" ON invoice_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete invoice items" ON invoice_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Payments: All authenticated users can access all payments
CREATE POLICY "All users can view payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update payments" ON payments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All users can delete payments" ON payments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Invoice sequences: All authenticated users can access all sequences
CREATE POLICY "All users can view invoice sequences" ON invoice_sequences
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert invoice sequences" ON invoice_sequences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update invoice sequences" ON invoice_sequences
  FOR UPDATE USING (auth.role() = 'authenticated');
