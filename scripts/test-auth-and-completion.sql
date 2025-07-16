-- Test auth and task completion

-- 1. First, let's see some actual user IDs in your system
SELECT id, email, first_name, last_name 
FROM users 
WHERE is_active = true
LIMIT 5;

-- 2. Let's see some tasks that exist
SELECT 
    pt.id as task_id,
    pt.title,
    pt.project_id,
    p.title as project_title
FROM project_tasks pt
JOIN projects p ON p.id = pt.project_id
WHERE pt.deleted_at IS NULL
LIMIT 5;

-- 3. Check if there are any task assignments
SELECT 
    ta.task_id,
    ta.user_id,
    pt.title as task_title,
    u.email as user_email
FROM task_assignments ta
JOIN project_tasks pt ON pt.id = ta.task_id
JOIN users u ON u.id = ta.user_id
LIMIT 5;

-- 4. Create a test function to simulate a completion
-- This will help us understand what's failing
CREATE OR REPLACE FUNCTION test_task_completion(
    p_task_id INTEGER,
    p_user_id TEXT
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_project_id INTEGER;
    v_is_member BOOLEAN;
BEGIN
    -- Check if task exists
    SELECT project_id INTO v_project_id
    FROM project_tasks
    WHERE id = p_task_id;
    
    IF v_project_id IS NULL THEN
        RETURN QUERY SELECT false, 'Task not found';
        RETURN;
    END IF;
    
    -- Check if user is a project member
    SELECT EXISTS(
        SELECT 1 FROM project_assignments
        WHERE project_id = v_project_id
        AND user_id = p_user_id
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN QUERY SELECT false, 'User is not a project member';
        RETURN;
    END IF;
    
    -- Try to insert (this won't actually insert due to RLS)
    RETURN QUERY SELECT true, 'User can complete this task';
END;
$$ LANGUAGE plpgsql;

-- 5. Test with a sample (replace with actual IDs from queries above)
-- SELECT * FROM test_task_completion(1, 'user-id-here');