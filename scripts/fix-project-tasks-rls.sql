-- Fix RLS policies for project_tasks table
-- This updates the policies to work with the new task_assignments structure

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view non-deleted tasks" ON project_tasks;
DROP POLICY IF EXISTS "Users can manage assigned tasks" ON project_tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON project_tasks;

-- Create new policies

-- Allow users to view tasks in projects they have access to
CREATE POLICY "Users can view tasks" ON project_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    ) OR
    is_admin()
  );

-- Allow project members to create tasks
CREATE POLICY "Project members can create tasks" ON project_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    ) OR
    is_admin()
  );

-- Allow project members to update tasks
CREATE POLICY "Project members can update tasks" ON project_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = project_tasks.id
      AND ta.user_id = get_current_user_id()
    ) OR
    is_admin()
  );

-- Allow project members and task assignees to delete tasks
CREATE POLICY "Project members can delete tasks" ON project_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_tasks.project_id
      AND pa.user_id = get_current_user_id()
      AND pa.role = 'owner'
    ) OR
    is_admin()
  );

-- Ensure RLS is enabled
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;