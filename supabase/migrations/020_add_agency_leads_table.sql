-- Agency Leads table for new customer acquisition tracking
CREATE TABLE agency_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  status TEXT NOT NULL DEFAULT 'contacted' CHECK (status IN ('contacted', 'negotiation', 'closed')),
  notes TEXT,
  customer_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (shared data model, same as customers)
ALTER TABLE agency_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON agency_leads FOR ALL USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_agency_leads_user_id ON agency_leads(user_id);
CREATE INDEX idx_agency_leads_status ON agency_leads(status);
CREATE INDEX idx_agency_leads_customer_id ON agency_leads(customer_id);
