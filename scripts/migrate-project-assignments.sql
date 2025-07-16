-- Migrate existing project assignee_ids to project_assignments table
-- This script safely migrates data from the old assignee_ids JSONB column to the new project_assignments table

-- Start transaction
BEGIN;

-- 1. First, let's see what we're about to migrate (for logging purposes)
DO $$
DECLARE
    project_count INTEGER;
    assignment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count
    FROM projects
    WHERE assignee_ids IS NOT NULL 
        AND assignee_ids != '[]'::jsonb
        AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO assignment_count
    FROM projects p, jsonb_array_elements_text(p.assignee_ids) as user_id
    WHERE p.assignee_ids IS NOT NULL 
        AND p.assignee_ids != '[]'::jsonb
        AND p.deleted_at IS NULL;
    
    RAISE NOTICE 'Found % projects with assignee_ids containing % total assignments to migrate', project_count, assignment_count;
END $$;

-- 2. Migrate assignee_ids from projects table to project_assignments table
INSERT INTO project_assignments (project_id, user_id, role, assigned_at)
SELECT DISTINCT
    p.id as project_id,
    user_id.value as user_id,
    'member' as role,  -- Default role, can be updated later
    COALESCE(p.created_at, NOW()) as assigned_at
FROM projects p
CROSS JOIN LATERAL jsonb_array_elements_text(p.assignee_ids) as user_id(value)
WHERE p.assignee_ids IS NOT NULL 
    AND p.assignee_ids != '[]'::jsonb
    AND p.deleted_at IS NULL
    -- Only insert if the user exists and is active
    AND EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = user_id.value
        AND u.deleted_at IS NULL
        AND u.is_active = true
    )
    -- Skip if assignment already exists
    AND NOT EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = p.id
        AND pa.user_id = user_id.value
    );

-- 3. Log the migration results
DO $$
DECLARE
    migrated_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM project_assignments;
    
    RAISE NOTICE 'Total project assignments after migration: %', total_count;
END $$;

-- 4. Identify the first assignee for each project and make them the 'owner'
UPDATE project_assignments pa
SET role = 'owner'
FROM (
    SELECT DISTINCT ON (project_id) 
        project_id, 
        user_id
    FROM project_assignments
    WHERE deleted_at IS NULL
    ORDER BY project_id, assigned_at ASC, user_id
) first_assignee
WHERE pa.project_id = first_assignee.project_id
    AND pa.user_id = first_assignee.user_id
    AND pa.role = 'member';

-- 5. Create a summary report
SELECT 
    'Migration Summary' as report_type,
    COUNT(DISTINCT project_id) as projects_with_assignments,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN role = 'owner' THEN 1 END) as owner_assignments,
    COUNT(CASE WHEN role = 'member' THEN 1 END) as member_assignments
FROM project_assignments
WHERE deleted_at IS NULL;

-- 6. Show sample of migrated data (first 10 projects)
SELECT 
    p.id as project_id,
    p.title as project_title,
    array_agg(
        json_build_object(
            'user_id', pa.user_id,
            'email', u.email,
            'name', CONCAT(u.first_name, ' ', u.last_name),
            'role', pa.role
        ) ORDER BY pa.role DESC, u.email
    ) as team_members
FROM projects p
JOIN project_assignments pa ON pa.project_id = p.id
JOIN users u ON u.id = pa.user_id
WHERE p.deleted_at IS NULL 
    AND pa.deleted_at IS NULL
    AND u.deleted_at IS NULL
GROUP BY p.id, p.title
ORDER BY p.created_at DESC
LIMIT 10;

-- Commit transaction
COMMIT;

-- Optional: After verifying the migration worked correctly, you can clear the assignee_ids column
-- UPDATE projects SET assignee_ids = '[]'::jsonb WHERE assignee_ids IS NOT NULL;