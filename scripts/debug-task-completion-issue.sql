-- Debug task completion issue

-- 1. Check if task_completions table has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'task_completions';

-- 2. Check the structure of task_completions
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'task_completions'
ORDER BY ordinal_position;

-- 3. List all current policies
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END AS command,
    pol.polpermissive AS is_permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'task_completions'::regclass
ORDER BY pol.polcmd;

-- 4. Test with a sample user ID (replace with an actual user ID from your system)
-- You can get a user ID by running: SELECT id FROM users LIMIT 5;

-- 5. Check if there are any task_completions already
SELECT COUNT(*) as total_completions FROM task_completions;

-- 6. Check a sample of existing completions
SELECT 
    tc.id,
    tc.task_id,
    tc.user_id,
    tc.completed_at,
    u.email as user_email
FROM task_completions tc
LEFT JOIN users u ON u.id = tc.user_id
LIMIT 5;