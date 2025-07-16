-- Check the structure of task_completions table

-- 1. Check table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_completions'
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_completions'::regclass;

-- 3. Check if table has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'task_completions';

-- 4. Check current user function
SELECT get_current_user_id();

-- 5. Test a simple insert (this will show the exact error)
-- DO $$
-- BEGIN
--     INSERT INTO task_completions (task_id, user_id, completed_at)
--     VALUES (1, get_current_user_id(), NOW());
-- EXCEPTION WHEN OTHERS THEN
--     RAISE NOTICE 'Error: %', SQLERRM;
-- END $$;