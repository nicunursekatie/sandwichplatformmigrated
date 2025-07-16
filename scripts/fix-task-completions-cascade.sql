-- Fix task_completions to properly cascade when tasks are deleted

-- First, check if there's already a foreign key constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_completions'::regclass
    AND contype = 'f';

-- Add foreign key constraint with CASCADE if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'task_completions'::regclass 
        AND conname = 'task_completions_task_id_fkey'
    ) THEN
        ALTER TABLE task_completions
        ADD CONSTRAINT task_completions_task_id_fkey
        FOREIGN KEY (task_id) 
        REFERENCES project_tasks(id) 
        ON DELETE CASCADE;
    ELSE
        -- If it exists but without CASCADE, drop and recreate
        ALTER TABLE task_completions 
        DROP CONSTRAINT IF EXISTS task_completions_task_id_fkey;
        
        ALTER TABLE task_completions
        ADD CONSTRAINT task_completions_task_id_fkey
        FOREIGN KEY (task_id) 
        REFERENCES project_tasks(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraint was created/updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_completions'::regclass
    AND conname = 'task_completions_task_id_fkey';