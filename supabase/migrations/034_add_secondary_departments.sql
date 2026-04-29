-- Add secondary departments array to employees
ALTER TABLE employees ADD COLUMN secondary_department_ids UUID[] DEFAULT '{}';
