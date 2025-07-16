-- Check how tasks are structured for the "Successfully updated project title" project

-- 1. First, find the project
SELECT id, title, status 
FROM projects 
WHERE title ILIKE '%successfully updated project title%'
LIMIT 1;

-- 2. Check all tasks for this project (replace PROJECT_ID with the actual ID from above)
-- SELECT 
--     pt.id,
--     pt.title,
--     pt.status,
--     pt.description,
--     COUNT(DISTINCT ta.user_id) as assignee_count
-- FROM project_tasks pt
-- LEFT JOIN task_assignments ta ON ta.task_id = pt.id
-- WHERE pt.project_id = PROJECT_ID
-- GROUP BY pt.id, pt.title, pt.status, pt.description
-- ORDER BY pt.id;

-- 3. Check task assignments for a sample task
-- SELECT 
--     pt.id as task_id,
--     pt.title as task_title,
--     ta.user_id,
--     u.first_name,
--     u.last_name
-- FROM project_tasks pt
-- JOIN task_assignments ta ON ta.task_id = pt.id
-- JOIN users u ON u.id = ta.user_id
-- WHERE pt.project_id = PROJECT_ID
-- ORDER BY pt.id, ta.user_id;