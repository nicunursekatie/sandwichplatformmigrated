-- Add unique constraint to project_assignments table
-- This ensures a user can only be assigned once to each project

-- First, check for any existing duplicates
SELECT 
    project_id, 
    user_id, 
    COUNT(*) as count
FROM project_assignments
WHERE deleted_at IS NULL
GROUP BY project_id, user_id
HAVING COUNT(*) > 1;

-- Add the unique constraint
ALTER TABLE project_assignments 
ADD CONSTRAINT project_assignments_project_user_unique 
UNIQUE (project_id, user_id);

-- Also add deleted_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_assignments' 
                   AND column_name = 'deleted_at') THEN
        ALTER TABLE project_assignments ADD COLUMN deleted_at TIMESTAMP;
    END IF;
END $$;