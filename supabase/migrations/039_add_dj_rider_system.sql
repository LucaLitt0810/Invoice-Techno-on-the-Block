-- ============================================================
-- DJ-Rider / Advancing-System
-- ============================================================

-- 1. Erweitere customers um Auth-Verknüpfung und Onboarding-Status
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- 2. Template-System (konfigurierbare Rider-Struktur)
CREATE TABLE IF NOT EXISTS dj_rider_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dj_rider_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES dj_rider_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dj_rider_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES dj_rider_template_sections(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'time', 'datetime', 'date', 'url', 'select', 'boolean')),
    placeholder TEXT,
    required BOOLEAN DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    options JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rider-Instanzen & Werte (pro Auftrag)
CREATE TABLE IF NOT EXISTS dj_riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES dj_rider_templates(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rider_per_order UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS dj_rider_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES dj_riders(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES dj_rider_template_fields(id) ON DELETE CASCADE,
    value TEXT DEFAULT NULL,
    confirmed_by_agency BOOLEAN DEFAULT false,
    confirmed_by_customer BOOLEAN DEFAULT false,
    last_modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_value_per_field UNIQUE (rider_id, field_id)
);

-- 4. Changelog & Nachrichten
CREATE TABLE IF NOT EXISTS dj_rider_changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES dj_riders(id) ON DELETE CASCADE,
    field_id UUID REFERENCES dj_rider_template_fields(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'modified_after_confirmation'))
);

CREATE TABLE IF NOT EXISTS dj_rider_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES dj_riders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Kunden-Zugriffsrechte auf Aufträge/Rider
CREATE TABLE IF NOT EXISTS order_customer_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    can_view_rider BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_access_per_order_customer UNIQUE (order_id, customer_id)
);

-- 6. Trigger: updated_at für neue Tabellen
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dj_rider_templates_updated_at ON dj_rider_templates;
CREATE TRIGGER update_dj_rider_templates_updated_at
    BEFORE UPDATE ON dj_rider_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dj_riders_updated_at ON dj_riders;
CREATE TRIGGER update_dj_riders_updated_at
    BEFORE UPDATE ON dj_riders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Trigger: Bei Änderung eines Werts -> Changelog-Eintrag
CREATE OR REPLACE FUNCTION log_dj_rider_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
        INSERT INTO dj_rider_changelog (
            rider_id, field_id, changed_by, old_value, new_value, status
        ) VALUES (
            NEW.rider_id,
            NEW.field_id,
            NEW.last_modified_by,
            OLD.value,
            NEW.value,
            'pending'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS dj_rider_value_change_trigger ON dj_rider_values;
CREATE TRIGGER dj_rider_value_change_trigger
    AFTER UPDATE ON dj_rider_values
    FOR EACH ROW EXECUTE FUNCTION log_dj_rider_change();

-- 8. RLS Policies (konsistent mit bestehendem Shared-Workspace Pattern)
ALTER TABLE dj_rider_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_rider_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_rider_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_rider_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_rider_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_rider_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_customer_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_templates;
CREATE POLICY "Allow all access" ON dj_rider_templates FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_template_sections;
CREATE POLICY "Allow all access" ON dj_rider_template_sections FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_template_fields;
CREATE POLICY "Allow all access" ON dj_rider_template_fields FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_riders;
CREATE POLICY "Allow all access" ON dj_riders FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_values;
CREATE POLICY "Allow all access" ON dj_rider_values FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_changelog;
CREATE POLICY "Allow all access" ON dj_rider_changelog FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON dj_rider_messages;
CREATE POLICY "Allow all access" ON dj_rider_messages FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON order_customer_access;
CREATE POLICY "Allow all access" ON order_customer_access FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 9. Default-Template mit Sektionen und Feldern aus den Screenshots
INSERT INTO dj_rider_templates (id, name, is_default)
VALUES (gen_random_uuid(), 'Standard DJ Rider', true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_template_id UUID;
    section_id UUID;
    existing_sections INTEGER;
BEGIN
    SELECT id INTO v_template_id FROM dj_rider_templates WHERE is_default = true LIMIT 1;

    IF v_template_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if sections already exist for this template
    SELECT COUNT(*) INTO existing_sections FROM dj_rider_template_sections WHERE template_id = v_template_id;

    IF existing_sections > 0 THEN
        RETURN;
    END IF;

    -- Section: Show
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Show', 10)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Artist', 'text', 10),
    (section_id, 'Name of event', 'text', 20),
    (section_id, 'Event website', 'url', 30),
    (section_id, 'Capacity', 'number', 40),
    (section_id, 'Doors open', 'time', 50),
    (section_id, 'Doors close', 'time', 60),
    (section_id, 'Age restrictions', 'text', 70);

    -- Section: Promoter
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Promoter', 20)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Company name', 'text', 10),
    (section_id, 'Address line 1', 'text', 20),
    (section_id, 'Address line 2', 'text', 30),
    (section_id, 'Postal code', 'text', 40),
    (section_id, 'City', 'text', 50),
    (section_id, 'Country', 'text', 60);

    -- Section: Arrival
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Arrival', 30)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, placeholder, sort_order) VALUES
    (section_id, 'Arrival', 'textarea', 'Flight details, arrival notes', 10),
    (section_id, 'Meeting Point', 'text', NULL, 20),
    (section_id, 'Driver', 'text', 'name + mobile + cartype', 30),
    (section_id, 'Duration', 'text', NULL, 40);

    -- Section: Departure
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Departure', 40)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Transfer Hotel->Airport pick-up time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30),
    (section_id, 'Departure', 'textarea', 40);

    -- Section: Show Transfers
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Show Transfers', 50)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Transfer Hotel->Venue pick-up time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30),
    (section_id, 'Duration', 'text', 40),
    (section_id, 'Transfer Venue->Hotel pick-up time', 'time', 50),
    (section_id, 'Meeting Point', 'text', 60),
    (section_id, 'Driver', 'text', 70);

    -- Section: Hotel
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Hotel', 60)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Booking Code', 'text', 10),
    (section_id, 'Hotel Info', 'text', 20),
    (section_id, 'Room Category', 'text', 30),
    (section_id, 'Check In', 'datetime', 40),
    (section_id, 'Check out', 'datetime', 50),
    (section_id, 'Inclusive', 'text', 60),
    (section_id, 'Check-In/Out Times Confirmed', 'boolean', 70);

    -- Section: Dinner
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Dinner', 70)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, placeholder, sort_order) VALUES
    (section_id, 'Restaurant', 'text', 'name + address + link', 10),
    (section_id, 'Pick-Up Time', 'time', NULL, 20),
    (section_id, 'Meeting Point', 'text', NULL, 30),
    (section_id, 'Driver', 'text', NULL, 40);

    -- Section: Soundcheck
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Soundcheck', 80)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Pick-Up Time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30);
END $$;
