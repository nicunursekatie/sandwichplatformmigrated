-- Test script for specific user profile updates
-- Replace 'ce79634b-fb82-42d5-8338-5fe1c5a2012f' with the user ID you want to test

-- 1. Check if the user exists in both tables
SELECT 
  'Auth users table:' as table_name,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'display_name' as display_name
FROM auth.users 
WHERE id = 'ce79634b-fb82-42d5-8338-5fe1c5a2012f'::uuid

UNION ALL

SELECT 
  'Public users table:' as table_name,
  id,
  email,
  first_name,
  last_name,
  display_name
FROM public.users 
WHERE id = 'ce79634b-fb82-42d5-8338-5fe1c5a2012f';

-- 2. Test the auth.user_role() function for this user
-- (This would need to be run as the authenticated user)
SELECT 
  'Current auth context:' as context,
  auth.uid()::text as current_user_id,
  auth.role() as current_role;

-- 3. Test if we can read the user's data (should work for authenticated users)
SELECT 
  'Can read user data:' as test,
  COUNT(*) as record_count
FROM users 
WHERE id = 'ce79634b-fb82-42d5-8338-5fe1c5a2012f';

-- 4. Show the current user data
SELECT 
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  is_active,
  updated_at
FROM users 
WHERE id = 'ce79634b-fb82-42d5-8338-5fe1c5a2012f';

-- 5. Test the RLS policies for this user
-- Note: This will only work if you're authenticated as this user
SELECT 
  'RLS Policy Test:' as test_name,
  CASE 
    WHEN auth.uid()::text = 'ce79634b-fb82-42d5-8338-5fe1c5a2012f' THEN '✅ User can update own profile'
    ELSE '❌ User cannot update this profile (not the owner)'
  END as policy_check; 