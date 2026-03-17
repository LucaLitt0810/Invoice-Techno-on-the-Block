-- Create contracts table for contract proposals
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('booking_offer', 'booking_confirmation', 'booking_rejection', 'custom')),
  title TEXT NOT NULL,
  event_date DATE,
  event_location TEXT,
  event_description TEXT,
  fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  deposit DECIMAL(10, 2) DEFAULT 0,
  deposit_due DATE,
  final_payment_due DATE,
  cancellation_terms TEXT,
  technical_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, contract_number)
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create policies (shared model - all authenticated users can access)
CREATE POLICY "Authenticated users can view all contracts"
ON contracts FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert contracts"
ON contracts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contracts"
ON contracts FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contracts"
ON contracts FOR DELETE
USING (auth.role() = 'authenticated');

-- Function to generate contract number
CREATE OR REPLACE FUNCTION get_next_contract_number(p_company_id UUID, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number INTEGER;
BEGIN
  SELECT last_number INTO v_last_number
  FROM invoice_sequences
  WHERE company_id = p_company_id AND year = p_year
  FOR UPDATE;
  
  IF v_last_number IS NULL THEN
    v_new_number := 1;
    INSERT INTO invoice_sequences (company_id, year, last_number)
    VALUES (p_company_id, p_year, v_new_number);
  ELSE
    v_new_number := v_last_number + 1;
    UPDATE invoice_sequences
    SET last_number = v_new_number, updated_at = NOW()
    WHERE company_id = p_company_id AND year = p_year;
  END IF;
  
  RETURN 'VER-' || p_year || '-' || LPAD(v_new_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
