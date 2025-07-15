-- =====================================================================
-- FIX PROJECT RELATIONSHIPS - Run in Supabase SQL Editor
-- =====================================================================
-- This script fixes the PostgREST relationship errors in project details
-- by adding the missing foreign key constraints and indexes.

-- First, let's check what constraints already exist
SELECT conname, contype, conrelid::regclass AS table_name, confrelid::regclass AS referenced_table
FROM pg_constraint 
WHERE conname LIKE '%project%' OR conname LIKE '%task%' OR conname LIKE '%user%'
ORDER BY conname;

-- =====================================================================
-- 1. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================================

-- Add foreign key from project_assignments to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_user') THEN
        ALTER TABLE project_assignments 
        ADD CONSTRAINT fk_project_assignments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: project_assignments -> users';
    ELSE
        RAISE NOTICE 'Foreign key already exists: project_assignments -> users';
    END IF;
END $$;

-- Add foreign key from project_assignments to projects
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_project') THEN
        ALTER TABLE project_assignments 
        ADD CONSTRAINT fk_project_assignments_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: project_assignments -> projects';
    ELSE
        RAISE NOTICE 'Foreign key already exists: project_assignments -> projects';
    END IF;
END $$;

-- Add foreign key from project_tasks to projects
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_tasks_project') THEN
        ALTER TABLE project_tasks 
        ADD CONSTRAINT fk_project_tasks_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: project_tasks -> projects';
    ELSE
        RAISE NOTICE 'Foreign key already exists: project_tasks -> projects';
    END IF;
END $$;

-- Add foreign key from task_assignments to project_tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_assignments_task') THEN
        ALTER TABLE task_assignments 
        ADD CONSTRAINT fk_task_assignments_task 
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: task_assignments -> project_tasks';
    ELSE
        RAISE NOTICE 'Foreign key already exists: task_assignments -> project_tasks';
    END IF;
END $$;

-- Add foreign key from task_assignments to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_assignments_user') THEN
        ALTER TABLE task_assignments 
        ADD CONSTRAINT fk_task_assignments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: task_assignments -> users';
    ELSE
        RAISE NOTICE 'Foreign key already exists: task_assignments -> users';
    END IF;
END $$;

-- Add foreign key from task_completions to project_tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_task') THEN
        ALTER TABLE task_completions 
        ADD CONSTRAINT fk_task_completions_task 
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: task_completions -> project_tasks';
    ELSE
        RAISE NOTICE 'Foreign key already exists: task_completions -> project_tasks';
    END IF;
END $$;

-- Add foreign key from task_completions to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_user') THEN
        ALTER TABLE task_completions 
        ADD CONSTRAINT fk_task_completions_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: task_completions -> users';
    ELSE
        RAISE NOTICE 'Foreign key already exists: task_completions -> users';
    END IF;
END $$;

-- =====================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

-- Index for project_assignments
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);

-- Index for project_tasks
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);

-- Index for task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);

-- Index for task_completions
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);

-- =====================================================================
-- 3. MIGRATE EXISTING DATA TO task_assignments
-- =====================================================================

-- Migrate data from assignee_ids array
INSERT INTO task_assignments (task_id, user_id, assigned_at)
SELECT 
    pt.id as task_id,
    UNNEST(pt.assignee_ids) as user_id,
    pt.created_at as assigned_at
FROM project_tasks pt
WHERE pt.assignee_ids IS NOT NULL 
  AND array_length(pt.assignee_ids, 1) > 0
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Migrate data from single assignee_id
INSERT INTO task_assignments (task_id, user_id, assigned_at)
SELECT 
    pt.id as task_id,
    pt.assignee_id as user_id,
    pt.created_at as assigned_at
FROM project_tasks pt
WHERE pt.assignee_id IS NOT NULL 
  AND pt.assignee_id != ''
  AND pt.assignee_id NOT IN (
    SELECT user_id FROM task_assignments WHERE task_id = pt.id
  )
ON CONFLICT (task_id, user_id) DO NOTHING;

-- =====================================================================
-- 4. SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on task_assignments if not already enabled
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Users can manage task assignments" ON task_assignments;

-- Create new policies
CREATE POLICY "Users can view task assignments" ON task_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage task assignments" ON task_assignments
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================================
-- 5. VERIFY THE RELATIONSHIPS
-- =====================================================================

-- Test the relationships that were failing
SELECT 'Testing project_assignments -> users relationship' as test;
SELECT pa.id, pa.user_id, u.email, u.first_name, u.last_name
FROM project_assignments pa
LEFT JOIN users u ON pa.user_id = u.id
LIMIT 3;

SELECT 'Testing task_assignments -> project_tasks relationship' as test;
SELECT ta.id, ta.task_id, pt.title, ta.user_id
FROM task_assignments ta
LEFT JOIN project_tasks pt ON ta.task_id = pt.id
LIMIT 3;

SELECT 'Testing task_assignments -> users relationship' as test;
SELECT ta.id, ta.user_id, u.email, u.first_name, u.last_name
FROM task_assignments ta
LEFT JOIN users u ON ta.user_id = u.id
LIMIT 3;

-- =====================================================================
-- 6. SHOW FINAL STATUS
-- =====================================================================

-- Show all foreign key constraints for project-related tables
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE contype = 'f' 
  AND (conrelid::regclass::text LIKE '%project%' 
       OR conrelid::regclass::text LIKE '%task%'
       OR conrelid::regclass::text LIKE '%user%')
ORDER BY conrelid::regclass, conname;

-- Show counts of data in key tables
SELECT 'Data Summary' as info;
SELECT 'projects' as table_name, COUNT(*) as row_count FROM projects
UNION ALL
SELECT 'project_tasks' as table_name, COUNT(*) as row_count FROM project_tasks
UNION ALL
SELECT 'project_assignments' as table_name, COUNT(*) as row_count FROM project_assignments
UNION ALL
SELECT 'task_assignments' as table_name, COUNT(*) as row_count FROM task_assignments
UNION ALL
SELECT 'task_completions' as table_name, COUNT(*) as row_count FROM task_completions
UNION ALL
SELECT 'users' as table_name, COUNT(*) as row_count FROM users;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
SELECT '✅ Database relationships have been fixed!' as status;
SELECT '🔄 PostgREST schema cache will refresh automatically' as note;
SELECT '🚀 Your project detail page should now work correctly' as result; 