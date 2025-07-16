-- Fix task_assignments foreign key to cascade on delete

-- Drop the existing foreign key constraint
ALTER TABLE task_assignments 
DROP CONSTRAINT IF EXISTS task_assignments_task_id_fkey;

-- Add it back with CASCADE option
ALTER TABLE task_assignments 
ADD CONSTRAINT task_assignments_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES project_tasks(id) 
ON DELETE CASCADE;

-- Verify the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'task_assignments'::regclass
AND conname = 'task_assignments_task_id_fkey';