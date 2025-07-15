-- Force resolve email conflict for katielong2316@gmail.com
-- This script will completely clean up and recreate the problematic records

-- 1. First, let's see exactly what we have
SELECT 
  'BEFORE CLEANUP - auth.users:' as status,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name
FROM auth.users 
WHERE email = 'katielong2316@gmail.com'

UNION ALL

SELECT 
  'BEFORE CLEANUP - public.users:' as status,
  id,
  email,
  first_name,
  last_name
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 2. Completely remove ALL records with this email from public.users
DELETE FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 3. Show what's left in public.users
SELECT 
  'AFTER CLEANUP - public.users:' as status,
  COUNT(*) as remaining_records
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 4. Now insert the correct record from auth.users
WITH auth_user AS (
  SELECT 
    id::text as id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'display_name' as display_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'is_active' as is_active,
    raw_user_meta_data->'permissions' as permissions,
    raw_user_meta_data as metadata
  FROM auth.users
  WHERE email = 'katielong2316@gmail.com'
  LIMIT 1
)
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  permissions,
  metadata,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  au.first_name,
  au.last_name,
  au.display_name,
  COALESCE(au.role, 'volunteer'),
  COALESCE(au.permissions, '[]'::jsonb),
  COALESCE(au.metadata, '{}'::jsonb),
  COALESCE(au.is_active::boolean, true),
  NOW(),
  NOW()
FROM auth_user au;

-- 5. Verify the insertion worked
SELECT 
  'AFTER INSERT - public.users:' as status,
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  is_active
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 6. Now sync all other users (excluding the problematic email)
WITH auth_users AS (
  SELECT 
    id::text as id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'display_name' as display_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'is_active' as is_active,
    raw_user_meta_data->'permissions' as permissions,
    raw_user_meta_data as metadata
  FROM auth.users
  WHERE email IS NOT NULL
  AND email != 'katielong2316@gmail.com'
)
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  permissions,
  metadata,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  au.first_name,
  au.last_name,
  au.display_name,
  COALESCE(au.role, 'volunteer'),
  COALESCE(au.permissions, '[]'::jsonb),
  COALESCE(au.metadata, '{}'::jsonb),
  COALESCE(au.is_active::boolean, true),
  NOW(),
  NOW()
FROM auth_users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- 7. Show final status
SELECT 
  'FINAL STATUS:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 8. Show all users in public.users
SELECT 
  'ALL USERS IN public.users:' as status,
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  is_active
FROM public.users
ORDER BY email;

-- 9. Final verification - no duplicates
SELECT 
  'DUPLICATE CHECK:' as status,
  email,
  COUNT(*) as count
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1; 