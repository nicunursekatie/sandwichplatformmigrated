-- Check if RLS is enabled on projects table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- Check RLS policies on projects table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- Check if current user can see projects
SELECT 
  current_user as current_user,
  session_user as session_user;

-- Test direct query as current user
SELECT COUNT(*) as projects_visible_to_current_user 
FROM projects; 