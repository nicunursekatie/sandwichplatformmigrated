-- Test the query structure for task stats

-- Check if the joins work properly
SELECT 
    pt.id as task_id,
    pt.status,
    COUNT(DISTINCT ta.user_id) as assignment_count,
    COUNT(DISTINCT tc.user_id) as completion_count
FROM project_tasks pt
LEFT JOIN task_assignments ta ON ta.task_id = pt.id
LEFT JOIN task_completions tc ON tc.task_id = pt.id AND tc.deleted_at IS NULL
WHERE pt.project_id IN (
    SELECT id FROM projects WHERE title ILIKE '%successfully updated project title%'
)
AND pt.deleted_at IS NULL
GROUP BY pt.id, pt.status;