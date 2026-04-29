-- Materials / Inventory table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Stück',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Material assignments to employees (Ausgabe / Abgabe)
CREATE TABLE material_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  issued_at TIMESTAMPTZ DEFAULT now(),
  returned_at TIMESTAMPTZ,
  issue_signature TEXT,
  return_signature TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON material_assignments FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_material_assignments_employee ON material_assignments(employee_id);
CREATE INDEX idx_material_assignments_material ON material_assignments(material_id);
