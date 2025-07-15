CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_user_id', true), auth.uid()::text);
END;
$$;

CREATE OR REPLACE FUNCTION set_current_user_id(user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM users 
  WHERE id = get_current_user_id();
  
  RETURN user_role IN ('admin', 'super_admin');
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM users 
  WHERE id = get_current_user_id();
  
  RETURN user_role = 'super_admin';
END;
$$; 