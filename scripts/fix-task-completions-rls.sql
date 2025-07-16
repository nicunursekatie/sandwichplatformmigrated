-- Fix RLS policies for task_completions to allow inserts

-- First, check existing policies
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

-- Drop existing policies if needed
DROP POLICY IF EXISTS "Users can view task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can create task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can delete task completions" ON task_completions;

-- Create new policies

-- SELECT: Allow viewing completions for tasks user can see
CREATE POLICY "Users can view task completions" ON task_completions
  FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM project_tasks pt
      JOIN project_assignments pa ON pa.project_id = pt.project_id
      WHERE pt.id = task_completions.task_id
      AND pa.user_id = get_current_user_id()
    )
  );

-- INSERT: Allow users assigned to the task to mark it complete
CREATE POLICY "Users can create task completions" ON task_completions
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id() AND
    (
      is_admin() OR
      EXISTS (
        SELECT 1 FROM task_assignments ta
        WHERE ta.task_id = task_completions.task_id
        AND ta.user_id = get_current_user_id()
      ) OR
      EXISTS (
        SELECT 1 FROM project_tasks pt
        JOIN project_assignments pa ON pa.project_id = pt.project_id
        WHERE pt.id = task_completions.task_id
        AND pa.user_id = get_current_user_id()
      )
    )
  );

-- UPDATE: Allow users to update their own completions
CREATE POLICY "Users can update task completions" ON task_completions
  FOR UPDATE
  USING (
    user_id = get_current_user_id() OR is_admin()
  );

-- DELETE: Allow users to delete their own completions
CREATE POLICY "Users can delete task completions" ON task_completions
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR is_admin()
  );

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