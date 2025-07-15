-- Sync auth.users to public.users table
-- This script ensures all auth users have corresponding records in the public.users table

-- 1. Check which auth users are missing from public.users table
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
)
SELECT 
  'Missing users in public.users table:' as status,
  au.id,
  au.email,
  au.first_name,
  au.last_name
FROM auth_users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 2. Insert missing users into public.users table
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
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Update existing users with latest metadata from auth
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
)
UPDATE public.users pu
SET 
  email = au.email,
  first_name = au.first_name,
  last_name = au.last_name,
  display_name = au.display_name,
  role = COALESCE(au.role, pu.role),
  permissions = COALESCE(au.permissions, pu.permissions),
  metadata = COALESCE(au.metadata, pu.metadata),
  is_active = COALESCE(au.is_active::boolean, pu.is_active),
  updated_at = NOW()
FROM auth_users au
WHERE pu.id = au.id
AND (
  pu.email IS DISTINCT FROM au.email OR
  pu.first_name IS DISTINCT FROM au.first_name OR
  pu.last_name IS DISTINCT FROM au.last_name OR
  pu.display_name IS DISTINCT FROM au.display_name OR
  pu.role IS DISTINCT FROM au.role OR
  pu.is_active IS DISTINCT FROM au.is_active::boolean
);

-- 4. Show final status
SELECT 
  'Final user count comparison:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 5. Show all users in public.users table
SELECT 
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  is_active,
  created_at,
  updated_at
FROM public.users
ORDER BY created_at DESC; 