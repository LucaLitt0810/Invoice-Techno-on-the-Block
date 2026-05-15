-- Rider settings: section visibility and field assignments
ALTER TABLE dj_riders
    ADD COLUMN IF NOT EXISTS disabled_section_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS field_assignments JSONB DEFAULT '{}';

-- RLS Policies for the new columns are already covered by dj_riders table policy
