-- Simple query to see all unique status values and their counts

SELECT 
    COALESCE(status, 'NULL') as status_value,
    COUNT(*) as project_count
FROM projects
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY project_count DESC;