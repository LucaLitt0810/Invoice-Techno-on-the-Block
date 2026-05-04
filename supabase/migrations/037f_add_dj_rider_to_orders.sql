-- Add DJ rider checklist field to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dj_rider_filled BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';
