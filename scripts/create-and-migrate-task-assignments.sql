-- Create task_assignments table and migrate existing task assignee_ids

BEGIN;

-- 1. Create task_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'task_assignments_task_user_unique'
    ) THEN
        ALTER TABLE task_assignments 
        ADD CONSTRAINT task_assignments_task_user_unique 
        UNIQUE (task_id, user_id);
    END IF;
END $$;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);

-- 3. Enable RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for task_assignments
DROP POLICY IF EXISTS "Users can view task assignments" ON task_assignments;
CREATE POLICY "Users can view task assignments" ON task_assignments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Project members can manage task assignments" ON task_assignments;
CREATE POLICY "Project members can manage task assignments" ON task_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_tasks pt
            JOIN project_assignments pa ON pa.project_id = pt.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.user_id = get_current_user_id()
        ) OR
        is_admin()
    );

-- 5. Migrate existing assignee_ids from project_tasks to task_assignments
DO $$
DECLARE
    task_count INTEGER;
    assignment_count INTEGER;
BEGIN
    -- Count tasks with assignee_ids
    SELECT COUNT(*) INTO task_count
    FROM project_tasks
    WHERE assignee_ids IS NOT NULL 
        AND array_length(assignee_ids, 1) > 0
        AND deleted_at IS NULL;
    
    -- Count total assignments to migrate
    SELECT COUNT(*) INTO assignment_count
    FROM project_tasks pt, unnest(pt.assignee_ids) as user_id
    WHERE pt.assignee_ids IS NOT NULL 
        AND array_length(pt.assignee_ids, 1) > 0
        AND pt.deleted_at IS NULL;
    
    RAISE NOTICE 'Found % tasks with assignee_ids containing % total assignments to migrate', task_count, assignment_count;
END $$;

-- 6. Perform the migration
INSERT INTO task_assignments (task_id, user_id, assigned_at)
SELECT 
    pt.id as task_id,
    unnest(pt.assignee_ids) as user_id,
    COALESCE(pt.created_at, NOW()) as assigned_at
FROM project_tasks pt
WHERE pt.assignee_ids IS NOT NULL 
    AND array_length(pt.assignee_ids, 1) > 0
    AND pt.deleted_at IS NULL
    -- Only insert if the user exists and is active
    AND EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = ANY(pt.assignee_ids)
        AND u.deleted_at IS NULL
        AND u.is_active = true
    )
ON CONFLICT (task_id, user_id) DO UPDATE 
SET 
    assigned_at = LEAST(task_assignments.assigned_at, EXCLUDED.assigned_at);

-- 7. Log the migration results
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM task_assignments;
    
    RAISE NOTICE 'Total task assignments after migration: %', total_count;
END $$;

-- 8. Create a summary report
SELECT 
    'Task Assignment Migration Summary' as report_type,
    COUNT(DISTINCT task_id) as tasks_with_assignments,
    COUNT(*) as total_assignments,
    COUNT(DISTINCT user_id) as unique_assignees
FROM task_assignments;

-- 9. Show sample of migrated data (first 10 tasks)
SELECT 
    pt.id as task_id,
    pt.title as task_title,
    p.title as project_title,
    array_agg(
        json_build_object(
            'user_id', ta.user_id,
            'email', u.email,
            'name', CONCAT(u.first_name, ' ', u.last_name)
        ) ORDER BY u.email
    ) as assignees
FROM project_tasks pt
JOIN projects p ON p.id = pt.project_id
JOIN task_assignments ta ON ta.task_id = pt.id
JOIN users u ON u.id = ta.user_id
WHERE u.deleted_at IS NULL
GROUP BY pt.id, pt.title, p.title
ORDER BY pt.created_at DESC
LIMIT 10;

COMMIT;

-- Optional: After verifying the migration worked correctly, you can clear the assignee_ids columns
-- UPDATE project_tasks SET assignee_ids = NULL WHERE assignee_ids IS NOT NULL;