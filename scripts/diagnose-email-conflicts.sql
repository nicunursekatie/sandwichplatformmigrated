-- Diagnostic script to identify email conflicts
-- This will help us understand exactly what's causing the unique constraint violation

-- 1. Check all users with the email katielong2316@gmail.com
SELECT 
  'Users with katielong2316@gmail.com:' as status,
  'auth.users' as table_name,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name
FROM auth.users 
WHERE email = 'katielong2316@gmail.com'

UNION ALL

SELECT 
  'Users with katielong2316@gmail.com:' as status,
  'public.users' as table_name,
  id,
  email,
  first_name,
  last_name
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 2. Check for any duplicate emails in public.users
SELECT 
  'Duplicate emails in public.users:' as status,
  email,
  COUNT(*) as count,
  array_agg(id) as user_ids,
  array_agg(first_name || ' ' || last_name) as names
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Check for any duplicate emails in auth.users
SELECT 
  'Duplicate emails in auth.users:' as status,
  email,
  COUNT(*) as count,
  array_agg(id::text) as user_ids,
  array_agg(COALESCE(raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(raw_user_meta_data->>'last_name', '')) as names
FROM auth.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Show all users with "Katie" or "Long" in their name
SELECT 
  'Users with Katie or Long in name (auth.users):' as status,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name
FROM auth.users 
WHERE raw_user_meta_data->>'first_name' ILIKE '%katie%' 
   OR raw_user_meta_data->>'last_name' ILIKE '%long%'
   OR raw_user_meta_data->>'first_name' ILIKE '%long%'
   OR raw_user_meta_data->>'last_name' ILIKE '%katie%'

UNION ALL

SELECT 
  'Users with Katie or Long in name (public.users):' as status,
  id,
  email,
  first_name,
  last_name
FROM public.users 
WHERE first_name ILIKE '%katie%' 
   OR last_name ILIKE '%long%'
   OR first_name ILIKE '%long%'
   OR last_name ILIKE '%katie%';

-- 5. Show the current state of both tables
SELECT 
  'Current table counts:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(DISTINCT email) FROM auth.users WHERE email IS NOT NULL) as unique_auth_emails,
  (SELECT COUNT(DISTINCT email) FROM public.users WHERE email IS NOT NULL) as unique_public_emails; 