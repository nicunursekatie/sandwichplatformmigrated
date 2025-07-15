DELETE FROM public.users WHERE email = 'katielong2316@gmail.com';

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

SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count; 