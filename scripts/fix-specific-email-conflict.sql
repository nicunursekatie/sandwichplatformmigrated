-- Fix specific email conflict for katielong2316@gmail.com
-- This script will identify and resolve the exact issue

-- 1. First, let's see exactly what's happening with this email
SELECT 
  'Current state for katielong2316@gmail.com:' as status,
  'auth.users' as table_name,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'display_name' as display_name
FROM auth.users 
WHERE email = 'katielong2316@gmail.com'

UNION ALL

SELECT 
  'Current state for katielong2316@gmail.com:' as status,
  'public.users' as table_name,
  id,
  email,
  first_name,
  last_name,
  display_name
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 2. Check if there are multiple records with this email in public.users
SELECT 
  'Duplicate check in public.users:' as status,
  COUNT(*) as count,
  array_agg(id) as user_ids
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 3. If there are duplicates, remove the older ones (keep the most recent)
DELETE FROM public.users 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      created_at,
      ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.users 
    WHERE email = 'katielong2316@gmail.com'
  ) ranked
  WHERE rn > 1
);

-- 4. Now try to sync this specific user
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
FROM auth_user au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 5. Show the final state for this email
SELECT 
  'Final state for katielong2316@gmail.com:' as status,
  'auth.users' as table_name,
  id::text as id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name
FROM auth.users 
WHERE email = 'katielong2316@gmail.com'

UNION ALL

SELECT 
  'Final state for katielong2316@gmail.com:' as status,
  'public.users' as table_name,
  id,
  email,
  first_name,
  last_name
FROM public.users 
WHERE email = 'katielong2316@gmail.com';

-- 6. Now try the full sync for all other users
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
  AND email != 'katielong2316@gmail.com'  -- Skip the problematic email
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
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 7. Show final status
SELECT 
  'Final sync complete:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count; 