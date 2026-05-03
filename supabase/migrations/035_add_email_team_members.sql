CREATE TABLE email_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Artist Management',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON email_team_members FOR ALL USING (true) WITH CHECK (true);
