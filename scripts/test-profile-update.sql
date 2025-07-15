-- Test script to verify user profile update functionality
-- This script helps diagnose issues with profile updates
-- NOTE: Run scripts/setup-complete-auth-system.sql first to create necessary functions

-- 1. Check if RLS is enabled on users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 2. List all policies on the users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- 3. Check the structure of the users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if there are any users in the table
SELECT id, email, first_name, last_name, display_name, created_at, updated_at
FROM users
LIMIT 5;

-- 5. Check if auth functions exist
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'auth' 
AND routine_name IN ('user_role', 'has_permission');

-- 6. Check current auth context
SELECT auth.uid(), auth.role();

-- 7. Test if we can read users (should work for authenticated users)
SELECT COUNT(*) as user_count FROM users;

-- 8. Check if the auth.users table has the expected data
SELECT id, email, raw_user_meta_data
FROM auth.users
LIMIT 5; 