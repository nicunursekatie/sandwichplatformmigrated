-- Complete setup script for auth system and user profile functionality
-- This script creates all necessary functions and policies

-- 1. Create the auth.user_role() function
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT raw_user_meta_data->>'role' 
     FROM auth.users 
     WHERE id = auth.uid()),
    'viewer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the auth.has_permission() function
CREATE OR REPLACE FUNCTION auth.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  -- Get permissions from auth.users metadata
  SELECT raw_user_meta_data->'permissions'
  INTO user_permissions
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if required permission exists in user's permissions array
  IF user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN user_permissions ? required_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- 5. Create the correct policies
-- Everyone can read users (for directory, chat, etc)
CREATE POLICY "Users are viewable by authenticated users" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update their own profile (match by id)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Users can insert their own profile data if needed
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Admins can manage all users
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (auth.user_role() = 'admin');

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 7. Verify the setup
SELECT 'Functions created successfully' as status;

-- 8. Test the functions
SELECT 
  'auth.user_role() test' as test_name,
  auth.user_role() as result;

-- 9. Show the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'users'; 