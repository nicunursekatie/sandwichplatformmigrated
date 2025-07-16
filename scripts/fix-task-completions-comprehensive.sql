-- Comprehensive fix for task_completions RLS policies
-- This script updates the auth function and fixes all RLS policies

-- Step 1: Fix the get_current_user_id() function
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(auth.uid()::TEXT, '')
$$;

-- Step 2: Check if task_completions table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'task_completions'
ORDER BY ordinal_position;

-- Step 3: Drop all existing policies on task_completions
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view task completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can create task completions" ON task_completions;
    DROP POLICY IF EXISTS "Project members can create task completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can update task completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can delete task completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can complete tasks" ON task_completions;
    DROP POLICY IF EXISTS "Authenticated users can view task completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can update own completions" ON task_completions;
    DROP POLICY IF EXISTS "Users can delete own completions" ON task_completions;
END $$;

-- Step 4: Create new, working policies

-- SELECT: Allow users to view completions for projects they're assigned to
CREATE POLICY "Project members can view task completions" ON task_completions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM project_tasks pt
            JOIN project_assignments pa ON pa.project_id = pt.project_id
            WHERE pt.id = task_completions.task_id
            AND pa.user_id = get_current_user_id()
        )
    );

-- INSERT: Allow project members to create completions for themselves
CREATE POLICY "Project members can complete tasks" ON task_completions
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id() AND
        EXISTS (
            SELECT 1 
            FROM project_tasks pt
            JOIN project_assignments pa ON pa.project_id = pt.project_id
            WHERE pt.id = task_completions.task_id
            AND pa.user_id = get_current_user_id()
        )
    );

-- UPDATE: Allow users to update their own completions
CREATE POLICY "Users can update own task completions" ON task_completions
    FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- DELETE: Allow users to delete their own completions (soft delete)
CREATE POLICY "Users can delete own task completions" ON task_completions
    FOR DELETE
    USING (user_id = get_current_user_id());

-- Step 5: Verify the policies were created
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END AS command,
    pol.polpermissive AS is_permissive
FROM pg_policy pol
WHERE pol.polrelid = 'task_completions'::regclass
ORDER BY pol.polcmd;

-- Step 6: Test the current user function
SELECT 
    auth.uid() as auth_uid,
    get_current_user_id() as current_user_function,
    CASE 
        WHEN auth.uid()::TEXT = get_current_user_id() THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status;