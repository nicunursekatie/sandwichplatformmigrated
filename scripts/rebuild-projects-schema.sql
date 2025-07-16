-- This script rebuilds the projects feature with a clean schema
-- Run this to fix all project-related issues

-- Step 1: Remove deprecated columns from projects table
ALTER TABLE projects 
DROP COLUMN IF EXISTS assignee_id,
DROP COLUMN IF EXISTS assignee_name,
DROP COLUMN IF EXISTS assignee_ids,
DROP COLUMN IF EXISTS assignee_names;

-- Step 2: Ensure project_assignments table has proper constraints
ALTER TABLE project_assignments
DROP CONSTRAINT IF EXISTS project_assignments_user_id_fkey;

ALTER TABLE project_assignments
ADD CONSTRAINT project_assignments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE project_assignments
DROP CONSTRAINT IF EXISTS project_assignments_project_id_fkey;

ALTER TABLE project_assignments
ADD CONSTRAINT project_assignments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Step 3: Add unique constraint to prevent duplicate assignments
ALTER TABLE project_assignments
DROP CONSTRAINT IF EXISTS unique_project_user_assignment;

ALTER TABLE project_assignments
ADD CONSTRAINT unique_project_user_assignment 
UNIQUE (project_id, user_id, deleted_at);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id 
ON project_assignments(project_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id 
ON project_assignments(user_id) WHERE deleted_at IS NULL;

-- Step 5: Create a view for easy project assignment queries
CREATE OR REPLACE VIEW project_assignments_with_users AS
SELECT 
    pa.id,
    pa.project_id,
    pa.user_id,
    pa.role,
    pa.assigned_at,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    COALESCE(u.display_name, u.first_name || ' ' || u.last_name) as full_name
FROM project_assignments pa
JOIN users u ON pa.user_id = u.id
WHERE pa.deleted_at IS NULL AND u.deleted_at IS NULL;

-- Step 6: Create a materialized view for project list performance
CREATE MATERIALIZED VIEW IF NOT EXISTS project_list_view AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.status,
    p.priority,
    p.due_date,
    p.created_at,
    p.updated_at,
    COALESCE(
        array_agg(
            DISTINCT jsonb_build_object(
                'user_id', pav.user_id,
                'full_name', pav.full_name,
                'email', pav.email,
                'role', pav.role
            ) 
            ORDER BY pav.full_name
        ) FILTER (WHERE pav.user_id IS NOT NULL), 
        '{}'::jsonb[]
    ) as assignments
FROM projects p
LEFT JOIN project_assignments_with_users pav ON p.id = pav.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.title, p.description, p.status, p.priority, p.due_date, p.created_at, p.updated_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_list_view_id ON project_list_view(id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_list_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_list_view;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh view when projects or assignments change
CREATE OR REPLACE FUNCTION trigger_refresh_project_list_view()
RETURNS trigger AS $$
BEGIN
    PERFORM refresh_project_list_view();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS refresh_project_list_on_project_change ON projects;
CREATE TRIGGER refresh_project_list_on_project_change
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_project_list_view();

DROP TRIGGER IF EXISTS refresh_project_list_on_assignment_change ON project_assignments;
CREATE TRIGGER refresh_project_list_on_assignment_change
AFTER INSERT OR UPDATE OR DELETE ON project_assignments
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_project_list_view();

-- Initial refresh
SELECT refresh_project_list_view();