-- Debug the 400 error for task_completions

-- 1. Check if task_completions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'task_completions'
) as table_exists;

-- 2. Check the exact structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_completions'
ORDER BY ordinal_position;

-- 3. Check if there are any NOT NULL constraints that might be causing issues
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_completions'::regclass
AND contype = 'c'; -- Check constraints

-- 4. Try a test insert with minimal data
-- This will help identify what's missing
DO $$
BEGIN
    INSERT INTO task_completions (task_id, user_id, completed_at)
    VALUES (1, '906911be-7cc5-4fc0-a2f6-a25c561bdc77', NOW());
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: % - %', SQLSTATE, SQLERRM;
END $$;