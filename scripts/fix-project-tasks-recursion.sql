-- Fix infinite recursion in project_tasks RLS policies

-- First, let's see all current policies on project_tasks
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
WHERE pol.polrelid = 'project_tasks'::regclass
ORDER BY pol.polcmd;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can delete tasks" ON project_tasks;

-- Create new, simpler policies that avoid recursion

-- SELECT: Allow viewing tasks if user is assigned to the project
CREATE POLICY "Users can view tasks" ON project_tasks
  FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    )
  );

-- INSERT: Allow creating tasks if user is assigned to the project
CREATE POLICY "Project members can create tasks" ON project_tasks
  FOR INSERT
  WITH CHECK (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    )
  );

-- UPDATE: Allow updating tasks if user is assigned to the project
-- Removed the task_assignments check to avoid potential recursion
CREATE POLICY "Project members can update tasks" ON project_tasks
  FOR UPDATE
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    )
  );

-- DELETE: Allow deleting tasks if user is assigned to the project
CREATE POLICY "Project members can delete tasks" ON project_tasks
  FOR DELETE
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    )
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
WHERE pol.polrelid = 'project_tasks'::regclass
ORDER BY pol.polcmd;