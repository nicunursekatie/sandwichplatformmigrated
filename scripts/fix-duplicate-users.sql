-- Fix duplicate users and handle unique constraint violations
-- This script identifies and resolves conflicts between auth.users and public.users

-- 1. First, let's see what's in the public.users table
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
  array_agg(id) as user_ids
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Check for conflicts between auth.users and public.users
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
  'Conflicts between auth and public users:' as status,
  au.email,
  au.id as auth_id,
  pu.id as public_id,
  CASE 
    WHEN pu.id IS NULL THEN 'Missing in public.users'
    WHEN au.id != pu.id THEN 'ID mismatch'
    ELSE 'Exists in both'
  END as conflict_type
FROM auth_users au
LEFT JOIN public.users pu ON au.email = pu.email;

-- 4. Clean up duplicate records in public.users (keep the most recent)
WITH duplicates AS (
  SELECT 
    email,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM public.users
  WHERE email IN (
    SELECT email 
    FROM public.users 
    WHERE email IS NOT NULL 
    GROUP BY email 
    HAVING COUNT(*) > 1
  )
)
DELETE FROM public.users 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- 5. Update existing users to match auth.users (by email)
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
  id = au.id,  -- Update to use auth.users ID
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
AND pu.id != au.id;  -- Only update if IDs don't match

-- 6. Now insert missing users (after cleanup)
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

-- 7. Show final status
SELECT 
  'Final user count comparison:' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- 8. Show final users table
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