-- Fix the get_current_user_id() function WITHOUT dropping it
-- This will CREATE OR REPLACE to update the function in place

-- First, let's see what the current function looks like
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_current_user_id';

-- Update the function to properly return the authenticated user's ID
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(auth.uid()::TEXT, '')
$$;

-- Test the function
SELECT auth.uid() as auth_uid, get_current_user_id() as function_result;

-- Also update is_admin function if it exists
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

-- Now let's also check the task_completions RLS policies
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'task_completions'::regclass
ORDER BY pol.polcmd;