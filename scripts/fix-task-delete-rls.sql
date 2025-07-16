-- Fix RLS policy to allow project members to delete tasks

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Project members can delete tasks" ON project_tasks;

-- Create a new policy that allows any project member to delete tasks
CREATE POLICY "Project members can delete tasks" ON project_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    ) OR
    is_admin()
  );

-- Alternatively, if you want to keep it restrictive to owners and task creators:
-- CREATE POLICY "Project members can delete tasks" ON project_tasks
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM project_assignments pa
--       WHERE pa.project_id = project_tasks.project_id
--       AND pa.user_id = get_current_user_id()
--       AND (pa.role = 'owner' OR project_tasks.created_by = get_current_user_id())
--     ) OR
--     is_admin()
--   );

-- Verify the policy was updated
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'd' THEN 'DELETE'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression
FROM pg_policy pol
WHERE pol.polrelid = 'project_tasks'::regclass
    AND pol.polcmd = 'd';