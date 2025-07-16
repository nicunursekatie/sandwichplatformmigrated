-- Fix task_completions to allow all project members to mark tasks complete
-- This is a simpler approach that should work

-- Step 1: Check current policies
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END AS command
FROM pg_policy pol
WHERE pol.polrelid = 'task_completions'::regclass
ORDER BY pol.polcmd;

-- Step 2: Drop ALL existing policies on task_completions
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT polname 
        FROM pg_policy 
        WHERE polrelid = 'task_completions'::regclass
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON task_completions', pol.polname);
    END LOOP;
END $$;

-- Step 3: Create simple, permissive policies that work

-- Allow authenticated users to see all task completions
CREATE POLICY "Anyone can view task completions" ON task_completions
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert completions for themselves
CREATE POLICY "Users can mark tasks complete" ON task_completions
    FOR INSERT
    WITH CHECK (
        -- User must be marking completion for themselves
        auth.uid()::text = user_id
    );

-- Allow users to update their own completions (for soft delete)
CREATE POLICY "Users can update their completions" ON task_completions
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Allow users to delete their own completions
CREATE POLICY "Users can delete their completions" ON task_completions
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- Step 4: Verify new policies
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

-- Step 5: Also ensure RLS is enabled
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;