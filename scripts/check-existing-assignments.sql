-- Check existing project assignments data

-- 1. Check projects with assignee_ids
SELECT 
    id,
    title,
    assignee_ids,
    jsonb_array_length(assignee_ids) as num_assignees
FROM projects
WHERE assignee_ids IS NOT NULL 
    AND assignee_ids != '[]'::jsonb
    AND deleted_at IS NULL
ORDER BY created_at DESC;

-- 2. Check existing project_assignments entries
SELECT 
    pa.project_id,
    p.title as project_title,
    pa.user_id,
    u.email as user_email,
    pa.role,
    pa.assigned_at
FROM project_assignments pa
JOIN projects p ON p.id = pa.project_id
JOIN users u ON u.id = pa.user_id
WHERE pa.deleted_at IS NULL
ORDER BY pa.project_id, pa.assigned_at;

-- 3. Compare - find projects with assignee_ids that don't have project_assignments
SELECT 
    p.id,
    p.title,
    p.assignee_ids
FROM projects p
WHERE p.assignee_ids IS NOT NULL 
    AND p.assignee_ids != '[]'::jsonb
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM project_assignments pa 
        WHERE pa.project_id = p.id 
        AND pa.deleted_at IS NULL
    );

-- 4. Count summary
SELECT 
    'Projects with assignee_ids' as description,
    COUNT(*) as count
FROM projects
WHERE assignee_ids IS NOT NULL 
    AND assignee_ids != '[]'::jsonb
    AND deleted_at IS NULL
UNION ALL
SELECT 
    'Projects with project_assignments' as description,
    COUNT(DISTINCT project_id) as count
FROM project_assignments
WHERE deleted_at IS NULL;