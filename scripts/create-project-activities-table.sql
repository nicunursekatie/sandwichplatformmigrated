-- Create project activities table to track all changes
CREATE TABLE IF NOT EXISTS project_activities (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'project_created',
        'member_added',
        'member_removed',
        'task_created',
        'task_updated',
        'task_deleted',
        'task_completed',
        'task_uncompleted',
        'project_updated',
        'due_date_changed',
        'priority_changed',
        'status_changed',
        'description_changed',
        'title_changed',
        'assignee_added',
        'assignee_removed'
    )),
    target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at DESC);
CREATE INDEX idx_project_activities_user_id ON project_activities(user_id);

-- Enable RLS
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view activities for their projects" ON project_activities
    FOR SELECT
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM project_assignments pa
            WHERE pa.project_id = project_activities.project_id
            AND pa.user_id = get_current_user_id()
        )
    );

CREATE POLICY "Users can create activities for their projects" ON project_activities
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id() AND
        (
            is_admin() OR
            EXISTS (
                SELECT 1 FROM project_assignments pa
                WHERE pa.project_id = project_activities.project_id
                AND pa.user_id = get_current_user_id()
            )
        )
    );

-- Function to log activities
CREATE OR REPLACE FUNCTION log_project_activity(
    p_project_id INTEGER,
    p_activity_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_target_user_id TEXT DEFAULT NULL,
    p_task_id INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO project_activities (
        project_id,
        user_id,
        activity_type,
        description,
        target_user_id,
        task_id,
        metadata
    ) VALUES (
        p_project_id,
        get_current_user_id(),
        p_activity_type,
        p_description,
        p_target_user_id,
        p_task_id,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_project_activity TO authenticated;