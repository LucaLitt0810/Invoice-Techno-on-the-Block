ALTER TABLE email_team_members
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_email_team_sort ON email_team_members(sort_order);
