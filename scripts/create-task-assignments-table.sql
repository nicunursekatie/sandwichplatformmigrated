-- Create task_assignments table for multi-user task assignments
-- This table links tasks to multiple users for collaborative work

CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_at ON task_assignments(assigned_at);

-- Create unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique 
ON task_assignments(task_id, user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view task assignments for tasks they have access to
CREATE POLICY "Users can view task assignments for accessible tasks" ON task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_tasks pt
            JOIN projects p ON pt.project_id = p.id
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.user_id = auth.uid()::text
        )
    );

-- Policy: Users can insert task assignments for tasks in projects they manage
CREATE POLICY "Users can create task assignments for managed projects" ON task_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_tasks pt
            JOIN projects p ON pt.project_id = p.id
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.user_id = auth.uid()::text
            AND pa.role IN ('owner', 'member')
        )
    );

-- Policy: Users can update task assignments for tasks in projects they manage
CREATE POLICY "Users can update task assignments for managed projects" ON task_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_tasks pt
            JOIN projects p ON pt.project_id = p.id
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.user_id = auth.uid()::text
            AND pa.role IN ('owner', 'member')
        )
    );

-- Policy: Users can delete task assignments for tasks in projects they manage
CREATE POLICY "Users can delete task assignments for managed projects" ON task_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_tasks pt
            JOIN projects p ON pt.project_id = p.id
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.user_id = auth.uid()::text
            AND pa.role IN ('owner', 'member')
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignments TO authenticated;
GRANT USAGE ON SEQUENCE task_assignments_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE task_assignments IS 'Links tasks to multiple users for collaborative work and multi-user task assignments';
COMMENT ON COLUMN task_assignments.task_id IS 'References the project task';
COMMENT ON COLUMN task_assignments.user_id IS 'References the assigned user';
COMMENT ON COLUMN task_assignments.assigned_at IS 'When the user was assigned to this task';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'task_assignments table created successfully with RLS policies and indexes';
END $$; 