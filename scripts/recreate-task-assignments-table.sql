-- Drop existing task_assignments table
DROP TABLE IF EXISTS task_assignments;

-- Create task_assignments table with correct schema
CREATE TABLE task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES project_tasks(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);

-- Enable RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view task assignments" ON task_assignments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert task assignments" ON task_assignments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update task assignments" ON task_assignments
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete task assignments" ON task_assignments
    FOR DELETE USING (true); 