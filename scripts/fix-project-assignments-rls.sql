-- Fix RLS policies for project_assignments table
-- This allows project members to add other users to the project

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view non-deleted assignments" ON project_assignments;
DROP POLICY IF EXISTS "Users can manage their own assignments" ON project_assignments;

-- Create new policies

-- Allow users to view all non-deleted assignments
CREATE POLICY "Users can view non-deleted assignments" ON project_assignments
  FOR SELECT
  USING (deleted_at IS NULL);

-- Allow users to create assignments if they are already a member of the project or an admin
CREATE POLICY "Project members can add new members" ON project_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_assignments.project_id
      AND pa.user_id = get_current_user_id()
      AND pa.deleted_at IS NULL
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_assignments.project_id
      AND p.assignee_ids::jsonb ? get_current_user_id()
      AND p.deleted_at IS NULL
    ) OR
    is_admin()
  );

-- Allow users to update their own assignments or if they're a project admin
CREATE POLICY "Users can update assignments" ON project_assignments
  FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = project_assignments.project_id
        AND pa.user_id = get_current_user_id()
        AND pa.role = 'owner'
        AND pa.deleted_at IS NULL
      ) OR
      is_admin()
    )
  );

-- Allow users to delete their own assignments or if they're a project admin
CREATE POLICY "Users can delete assignments" ON project_assignments
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_assignments.project_id
      AND pa.user_id = get_current_user_id()
      AND pa.role = 'owner'
      AND pa.deleted_at IS NULL
    ) OR
    is_admin()
  );

-- Ensure the get_current_user_id function exists
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  SELECT coalesce(auth.uid()::text, '')
$$;

-- Ensure the is_admin function exists
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = get_current_user_id() 
    AND role IN ('admin', 'super_admin')
    AND deleted_at IS NULL
  )
$$;