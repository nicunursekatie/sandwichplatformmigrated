-- Check all foreign key constraints that reference project_tasks
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE confrelid = 'project_tasks'::regclass
    AND contype = 'f'
ORDER BY conrelid::regclass::text;

-- Also check if there are any task_completions referencing the task
SELECT 
    'task_completions' as table_name,
    COUNT(*) as reference_count
FROM task_completions
WHERE task_id IN (SELECT id FROM project_tasks WHERE deleted_at IS NULL);