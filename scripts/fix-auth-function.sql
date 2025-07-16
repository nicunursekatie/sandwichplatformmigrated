-- Fix the get_current_user_id() function to properly return the authenticated user

-- First, check if the function exists and what it returns
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_current_user_id';

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_current_user_id();

-- Create a proper function that returns the current authenticated user's ID
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(auth.uid()::TEXT, '')
$$;

-- Test the function
SELECT get_current_user_id();

-- Also create an is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has admin role in users table
    RETURN EXISTS (
        SELECT 1 
        FROM users 
        WHERE id = auth.uid()::TEXT 
        AND role = 'admin'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;