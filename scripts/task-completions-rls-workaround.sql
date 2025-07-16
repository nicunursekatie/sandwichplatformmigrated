-- Temporary workaround for task completions RLS
-- This creates more permissive policies while we fix the auth function

-- Drop all existing policies on task_completions
DROP POLICY IF EXISTS "Users can view task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can create task completions" ON task_completions;
DROP POLICY IF EXISTS "Project members can create task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can delete task completions" ON task_completions;

-- Create new, more permissive policies

-- Allow authenticated users to view all task completions for now
CREATE POLICY "Authenticated users can view task completions" ON task_completions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create completions for their own user_id
CREATE POLICY "Users can complete tasks" ON task_completions
    FOR INSERT
    WITH CHECK (
        auth.uid()::TEXT = user_id
    );

-- Allow users to update their own completions
CREATE POLICY "Users can update own completions" ON task_completions
    FOR UPDATE
    USING (auth.uid()::TEXT = user_id);

-- Allow users to delete their own completions
CREATE POLICY "Users can delete own completions" ON task_completions
    FOR DELETE
    USING (auth.uid()::TEXT = user_id);

-- Verify the new policies
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