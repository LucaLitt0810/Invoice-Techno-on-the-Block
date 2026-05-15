-- Remove the automatic changelog trigger to prevent duplicates
-- Changelog entries are now created explicitly by the application
DROP TRIGGER IF EXISTS dj_rider_value_change_trigger ON dj_rider_values;
DROP FUNCTION IF EXISTS log_dj_rider_change();
