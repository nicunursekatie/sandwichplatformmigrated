-- Check RLS policies on projects table for DELETE operation

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'projects';

-- 2. Check DELETE policies specifically
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'd' THEN 'DELETE'
    END AS command,
    pol.polpermissive AS is_permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'projects'::regclass
AND pol.polcmd = 'd';

-- 3. Check all policies on projects table
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pol.polpermissive AS is_permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression
FROM pg_policy pol
WHERE pol.polrelid = 'projects'::regclass
ORDER BY pol.polcmd;

-- 4. Test if current user can delete a specific project
-- Replace with an actual project ID you're trying to delete
-- SELECT id, title, status 
-- FROM projects 
-- WHERE id = YOUR_PROJECT_ID;