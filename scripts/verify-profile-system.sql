-- Verification script for profile system
-- Run this after applying the setup script to verify everything is working

-- 1. Check if auth functions exist and work
DO $$
BEGIN
  -- Test if auth.user_role() exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'auth' AND routine_name = 'user_role'
  ) THEN
    RAISE NOTICE '✅ auth.user_role() function exists';
  ELSE
    RAISE NOTICE '❌ auth.user_role() function does not exist';
  END IF;
  
  -- Test if auth.has_permission() exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'auth' AND routine_name = 'has_permission'
  ) THEN
    RAISE NOTICE '✅ auth.has_permission() function exists';
  ELSE
    RAISE NOTICE '❌ auth.has_permission() function does not exist';
  END IF;
END $$;

-- 2. Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM pg_tables 
WHERE tablename = 'users';

-- 3. List user table policies
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN permissive THEN 'Permissive'
    ELSE 'Restrictive'
  END as policy_type,
  qual as condition
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 4. Check user table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_default IS NOT NULL THEN 'Has default'
    ELSE 'No default'
  END as default_status
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('id', 'email', 'first_name', 'last_name', 'display_name', 'updated_at')
ORDER BY ordinal_position;

-- 5. Count users in the system
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
  COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as users_with_first_name,
  COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as users_with_last_name,
  COUNT(CASE WHEN display_name IS NOT NULL THEN 1 END) as users_with_display_name
FROM users;

-- 6. Check auth.users table
SELECT 
  COUNT(*) as auth_users_count,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as auth_users_with_email
FROM auth.users; 