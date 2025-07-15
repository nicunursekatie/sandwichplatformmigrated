-- Fix Project Relationships and Missing Tables
-- This script addresses the PostgREST relationship errors

-- First, let's add the missing foreign key constraints

-- 1. Add foreign key from project_assignments to users
ALTER TABLE project_assignments 
ADD CONSTRAINT fk_project_assignments_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add foreign key from project_assignments to projects
ALTER TABLE project_assignments 
ADD CONSTRAINT fk_project_assignments_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 3. Add foreign key from project_tasks to projects
ALTER TABLE project_tasks 
ADD CONSTRAINT fk_project_tasks_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 4. Add foreign key from task_completions to project_tasks
ALTER TABLE task_completions 
ADD CONSTRAINT fk_task_completions_task 
FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;

-- 5. Add foreign key from task_completions to users
ALTER TABLE task_completions 
ADD CONSTRAINT fk_task_completions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Create task_assignments table if the frontend expects it
-- This table will handle many-to-many relationships between tasks and users
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_task_user UNIQUE (task_id, user_id)
);

-- 7. Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);

-- 8. Migrate existing task assignee data to task_assignments table
-- This handles the existing assignee_ids array data
INSERT INTO task_assignments (task_id, user_id, assigned_at)
SELECT 
    pt.id as task_id,
    UNNEST(pt.assignee_ids) as user_id,
    pt.created_at as assigned_at
FROM project_tasks pt
WHERE pt.assignee_ids IS NOT NULL 
  AND array_length(pt.assignee_ids, 1) > 0
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 9. Handle single assignee_id column as well
INSERT INTO task_assignments (task_id, user_id, assigned_at)
SELECT 
    pt.id as task_id,
    pt.assignee_id as user_id,
    pt.created_at as assigned_at
FROM project_tasks pt
WHERE pt.assignee_id IS NOT NULL 
  AND pt.assignee_id != ''
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 10. Set up Row Level Security (RLS) for task_assignments
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view task assignments
CREATE POLICY "Users can view task assignments" ON task_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage task assignments
CREATE POLICY "Users can manage task assignments" ON task_assignments
    FOR ALL USING (auth.role() = 'authenticated');

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema'; 