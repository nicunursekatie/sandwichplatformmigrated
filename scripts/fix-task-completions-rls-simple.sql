-- Simplified RLS fix for task_completions
-- This allows any project member to mark tasks complete

-- First check existing policies
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

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create task completions" ON task_completions;

-- Create a simpler INSERT policy - allow project members to mark any task complete
CREATE POLICY "Project members can create task completions" ON task_completions
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

-- Verify the new policy
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'a' THEN 'INSERT'
    END AS command,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'task_completions'::regclass
AND pol.polcmd = 'a';