-- Check and fix project deletion issues
-- Run this in your Supabase SQL editor

-- First, check if RLS is enabled on the projects table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- Check existing RLS policies
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pol.polroles AS roles,
    CASE 
        WHEN pol.polpermissive THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END AS type,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE cls.relname = 'projects'
AND nsp.nspname = 'public';

-- If RLS is enabled but there's no DELETE policy, add one
-- This allows authenticated users to delete projects
CREATE POLICY "Authenticated users can delete projects" ON projects
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Alternative: Allow users with specific permissions to delete
-- CREATE POLICY "Users with manage_projects permission can delete" ON projects
--     FOR DELETE 
--     USING (
--         EXISTS (
--             SELECT 1 FROM users 
--             WHERE users.id = auth.uid()::text 
--             AND 'manage_projects' = ANY(users.permissions)
--         )
--     );

-- Check if there are any foreign key constraints that might prevent deletion
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'projects';

-- Test delete with a specific project ID (replace with an actual ID to test)
-- DELETE FROM projects WHERE id = 1 RETURNING *;