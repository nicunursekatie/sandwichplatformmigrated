-- Check what status values actually exist in the projects table

-- 1. Get all unique status values and their counts
SELECT 
    status,
    COUNT(*) as count
FROM projects
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;

-- 2. Show a sample of projects with their statuses
SELECT 
    id,
    title,
    status,
    created_at
FROM projects
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any NULL status values
SELECT 
    COUNT(*) as null_status_count
FROM projects
WHERE status IS NULL
AND deleted_at IS NULL;

-- 4. Check column definition for status
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'status';