-- Diagnostic script to identify user conflicts
-- This will show us exactly what's causing the constraint violation

-- 1. Check what's currently in public.users table
SELECT 
  'Current public.users table:' as status,
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  created_at,
  updated_at
FROM public.users
ORDER BY created_at DESC;

-- 2. Check for duplicate emails in public.users
SELECT 
  'Duplicate emails in public.users:' as status,
  email,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as user_ids,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Check auth.users for the problematic email
SELECT 
  'Auth users with katielong2316@gmail.com:' as status,
  id::text as auth_id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'display_name' as display_name
FROM auth.users
WHERE email = 'katielong2316@gmail.com';

-- 4. Check public.users for the problematic email
SELECT 
  'Public users with katielong2316@gmail.com:' as status,
  id as public_id,
  email,
  first_name,
  last_name,
  display_name,
  created_at,
  updated_at
FROM public.users
WHERE email = 'katielong2316@gmail.com';

-- 5. Show all auth users that need to be synced
WITH auth_users AS (
  SELECT 
    id::text as id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'display_name' as display_name,
    raw_user_meta_data->>'role' as role
  FROM auth.users
  WHERE email IS NOT NULL
)
SELECT 
  'Auth users to sync:' as status,
  au.id as auth_id,
  au.email,
  au.first_name,
  au.last_name,
  pu.id as public_id,
  CASE 
    WHEN pu.id IS NULL THEN 'Missing in public.users'
    WHEN au.id != pu.id THEN 'ID mismatch'
    ELSE 'Exists in both'
  END as status
FROM auth_users au
LEFT JOIN public.users pu ON au.email = pu.email
ORDER BY au.email; 