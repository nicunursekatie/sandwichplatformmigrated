-- Debug task deletion issue

-- 1. Check ALL constraints on task_assignments
SELECT 
    'task_assignments constraints' as check_type,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_assignments'::regclass
ORDER BY conname;

-- 2. Check ALL constraints on task_completions  
SELECT 
    'task_completions constraints' as check_type,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_completions'::regclass
ORDER BY conname;

-- 3. Check ALL tables that reference project_tasks
SELECT 
    conrelid::regclass AS referencing_table,
    a.attname AS referencing_column,
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.confrelid = 'project_tasks'::regclass
    AND c.contype = 'f'
ORDER BY conrelid::regclass::text, a.attname;

-- 4. Check if RLS is enabled and what policies exist
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('project_tasks', 'task_assignments', 'task_completions');

-- 5. List RLS policies on project_tasks
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pol.polpermissive AS permissive,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'project_tasks'::regclass;