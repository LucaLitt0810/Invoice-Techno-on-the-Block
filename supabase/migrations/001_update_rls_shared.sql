-- Migration: Update RLS policies for shared workspace model
-- All authenticated users can access all companies, customers, invoices, and products

-- ==========================================
-- COMPANIES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view all companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;

-- Allow all authenticated users to read all companies
CREATE POLICY "Authenticated users can view all companies"
ON companies FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to create companies
CREATE POLICY "Authenticated users can insert companies"
ON companies FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update any company
CREATE POLICY "Authenticated users can update companies"
ON companies FOR UPDATE
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete any company
CREATE POLICY "Authenticated users can delete companies"
ON companies FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- CUSTOMERS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

CREATE POLICY "Authenticated users can view all customers"
ON customers FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers"
ON customers FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
ON customers FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete customers"
ON customers FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- PRODUCTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Authenticated users can view all products"
ON products FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products"
ON products FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
ON products FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products"
ON products FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- INVOICES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

CREATE POLICY "Authenticated users can view all invoices"
ON invoices FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoices"
ON invoices FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoices"
ON invoices FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete invoices"
ON invoices FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- INVOICE_ITEMS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can view all invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can insert invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can update invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated users can delete invoice_items" ON invoice_items;

CREATE POLICY "Authenticated users can view all invoice_items"
ON invoice_items FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoice_items"
ON invoice_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoice_items"
ON invoice_items FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete invoice_items"
ON invoice_items FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- PAYMENTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;

CREATE POLICY "Authenticated users can view all payments"
ON payments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payments"
ON payments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payments"
ON payments FOR DELETE
USING (auth.role() = 'authenticated');

-- ==========================================
-- INVOICE_SEQUENCES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can insert own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can update own invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can view all invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can insert invoice_sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Authenticated users can update invoice_sequences" ON invoice_sequences;

CREATE POLICY "Authenticated users can view all invoice_sequences"
ON invoice_sequences FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoice_sequences"
ON invoice_sequences FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoice_sequences"
ON invoice_sequences FOR UPDATE
USING (auth.role() = 'authenticated');
