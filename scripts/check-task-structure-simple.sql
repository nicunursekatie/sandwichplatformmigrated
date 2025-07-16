-- Check how tasks are structured for the "Successfully updated project title" project

-- 1. Find the project and show its tasks with assignee counts
SELECT 
    p.id as project_id,
    p.title as project_title,
    pt.id as task_id,
    pt.title as task_title,
    pt.status as task_status,
    COUNT(DISTINCT ta.user_id) as assignee_count
FROM projects p
LEFT JOIN project_tasks pt ON pt.project_id = p.id
LEFT JOIN task_assignments ta ON ta.task_id = pt.id
WHERE p.title ILIKE '%successfully updated project title%'
  AND p.deleted_at IS NULL
  AND pt.deleted_at IS NULL
GROUP BY p.id, p.title, pt.id, pt.title, pt.status
ORDER BY pt.id;

-- 2. Show the detailed assignees for each task
SELECT 
    p.title as project_title,
    pt.id as task_id,
    pt.title as task_title,
    pt.status,
    u.first_name || ' ' || u.last_name as assignee_name,
    CASE WHEN tc.id IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as completion_status
FROM projects p
JOIN project_tasks pt ON pt.project_id = p.id
LEFT JOIN task_assignments ta ON ta.task_id = pt.id
LEFT JOIN users u ON u.id = ta.user_id
LEFT JOIN task_completions tc ON tc.task_id = pt.id AND tc.user_id = ta.user_id AND tc.deleted_at IS NULL
WHERE p.title ILIKE '%successfully updated project title%'
  AND p.deleted_at IS NULL
  AND pt.deleted_at IS NULL
ORDER BY pt.id, u.first_name;

-- 3. Count total tasks vs total assignments
SELECT 
    COUNT(DISTINCT pt.id) as unique_tasks,
    COUNT(DISTINCT ta.id) as total_assignments,
    COUNT(DISTINCT CASE WHEN pt.status = 'done' THEN pt.id END) as completed_tasks
FROM projects p
JOIN project_tasks pt ON pt.project_id = p.id
LEFT JOIN task_assignments ta ON ta.task_id = pt.id
WHERE p.title ILIKE '%successfully updated project title%'
  AND p.deleted_at IS NULL
  AND pt.deleted_at IS NULL;