-- Check current RLS policies on projects table
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

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- Option 1: Temporarily disable RLS for projects table (run as superuser)
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a policy that allows all operations (run as superuser)
-- DROP POLICY IF EXISTS "Enable all operations for projects" ON projects;
-- CREATE POLICY "Enable all operations for projects" ON projects
--   FOR ALL USING (true) WITH CHECK (true);

-- Option 3: Create a policy that allows insert for authenticated users
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
-- CREATE POLICY "Enable insert for authenticated users" ON projects
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Option 4: Create a policy that allows all operations for authenticated users
-- DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON projects;
-- CREATE POLICY "Enable all operations for authenticated users" ON projects
--   FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated'); 