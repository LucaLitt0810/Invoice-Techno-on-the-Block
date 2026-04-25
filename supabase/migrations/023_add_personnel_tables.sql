-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  entry_date DATE NOT NULL,
  nda_link TEXT,
  job_desc_link TEXT,
  data_storage_link TEXT,
  bank_name TEXT,
  iban TEXT,
  bic TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee entries / logs table
CREATE TABLE employee_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative', 'warning', 'training', 'termination', 'entry', 'contract')),
  title TEXT NOT NULL,
  description TEXT,
  entry_date DATE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON employee_entries FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employee_entries_employee ON employee_entries(employee_id);
CREATE INDEX idx_employee_entries_type ON employee_entries(type);
