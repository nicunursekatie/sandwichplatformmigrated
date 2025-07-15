-- Safe sync script that handles conflicts gracefully
-- This script uses UPSERT operations to avoid constraint violations

-- 1. First, let's see what we're working with
SELECT 
  'Current state:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 2. Use UPSERT to sync users (insert or update)
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

-- 3. Also handle email conflicts (in case there are users with same email but different IDs)
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
  id = au.id,
  first_name = au.first_name,
  last_name = au.last_name,
  display_name = au.display_name,
  role = COALESCE(au.role, pu.role),
  permissions = COALESCE(au.permissions, pu.permissions),
  metadata = COALESCE(au.metadata, pu.metadata),
  is_active = COALESCE(au.is_active::boolean, pu.is_active),
  updated_at = NOW()
FROM auth_users au
WHERE pu.email = au.email
AND pu.id != au.id;

-- 4. Show final status
SELECT 
  'Final state:' as status,
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

-- 6. Verify no duplicates
SELECT 
  'Duplicate check:' as status,
  email,
  COUNT(*) as count
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1; 