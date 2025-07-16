-- Debug project assignments issue

-- Check if project_assignments table exists and has data
SELECT COUNT(*) as assignment_count FROM project_assignments;

-- Check first few project assignments
SELECT pa.id, pa.project_id, pa.user_id, pa.role, pa.assigned_at, pa.deleted_at,
       u.email, u.first_name, u.last_name
FROM project_assignments pa
LEFT JOIN users u ON pa.user_id = u.id
ORDER BY pa.project_id, pa.assigned_at
LIMIT 10;

-- Check projects table
SELECT id, title, status, assignee_name, assignee_names, assignee_ids, created_at, deleted_at
FROM projects 
ORDER BY created_at DESC
LIMIT 10;

-- Check for any orphaned assignments (assignments where project is deleted)
SELECT pa.project_id, COUNT(*) as assignment_count
FROM project_assignments pa
LEFT JOIN projects p ON pa.project_id = p.id
WHERE p.id IS NULL OR p.deleted_at IS NOT NULL
GROUP BY pa.project_id;

-- Check users table for referenced users
SELECT id, email, first_name, last_name, created_at, deleted_at
FROM users
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM project_assignments 
    WHERE deleted_at IS NULL
)
ORDER BY created_at DESC
LIMIT 10;