-- Check the actual columns in kudos_tracking table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'kudos_tracking'
ORDER BY ordinal_position;