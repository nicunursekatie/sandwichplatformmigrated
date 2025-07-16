-- Check how task completions work for "Successfully updated project title"

-- Show each task with completion details
SELECT 
    pt.id as task_id,
    pt.title as task_title,
    pt.status as task_status,
    COUNT(DISTINCT ta.user_id) as total_assignees,
    COUNT(DISTINCT tc.user_id) as completed_by_count,
    CASE 
        WHEN COUNT(DISTINCT ta.user_id) = 0 THEN 'No assignees'
        WHEN COUNT(DISTINCT tc.user_id) = 0 THEN 'Not started'
        WHEN COUNT(DISTINCT tc.user_id) < COUNT(DISTINCT ta.user_id) THEN 
            'In progress (' || COUNT(DISTINCT tc.user_id) || '/' || COUNT(DISTINCT ta.user_id) || ' completed)'
        WHEN COUNT(DISTINCT tc.user_id) = COUNT(DISTINCT ta.user_id) THEN 'Completed by all'
        ELSE 'Unknown'
    END as completion_status
FROM projects p
JOIN project_tasks pt ON pt.project_id = p.id
LEFT JOIN task_assignments ta ON ta.task_id = pt.id
LEFT JOIN task_completions tc ON tc.task_id = pt.id AND tc.user_id = ta.user_id AND tc.deleted_at IS NULL
WHERE p.title ILIKE '%successfully updated project title%'
  AND p.deleted_at IS NULL
  AND pt.deleted_at IS NULL
GROUP BY pt.id, pt.title, pt.status
ORDER BY pt.id;