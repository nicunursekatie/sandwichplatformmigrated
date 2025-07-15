-- Safe step-by-step sync script
-- This script syncs users one by one to avoid constraint violations

-- 1. First, let's see what we're working with
SELECT 
  'Current state:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 2. Show all auth users that need to be synced
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
  'Auth users to sync:' as status,
  au.id,
  au.email,
  au.first_name,
  au.last_name,
  CASE 
    WHEN pu.id IS NULL THEN 'Missing in public.users'
    WHEN pu.id != au.id THEN 'ID mismatch'
    ELSE 'Exists in both'
  END as sync_status
FROM auth_users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.email;

-- 3. Update existing users by ID (safe operation)
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
WHERE pu.id = au.id;

-- 4. Insert only missing users (by ID)
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- 5. Show final status
SELECT 
  'Final state:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 6. Show all users in public.users table
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

-- 7. Verify no duplicates
SELECT 
  'Duplicate check:' as status,
  email,
  COUNT(*) as count
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1; 