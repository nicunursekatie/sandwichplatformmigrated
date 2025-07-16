-- Create triggers to automatically log activities

-- Trigger for task creation
CREATE OR REPLACE FUNCTION log_task_created() RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_project_activity(
        NEW.project_id,
        'task_created',
        'Created task: ' || NEW.title,
        NULL,
        NEW.id,
        jsonb_build_object('title', NEW.title)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_task_created
    AFTER INSERT ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_created();

-- Trigger for task updates
CREATE OR REPLACE FUNCTION log_task_updated() RETURNS TRIGGER AS $$
BEGIN
    -- Check what changed and log appropriately
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'done' THEN
            PERFORM log_project_activity(
                NEW.project_id,
                'task_completed',
                'Completed task: ' || NEW.title,
                NULL,
                NEW.id,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        ELSIF OLD.status = 'done' AND NEW.status != 'done' THEN
            PERFORM log_project_activity(
                NEW.project_id,
                'task_uncompleted',
                'Reopened task: ' || NEW.title,
                NULL,
                NEW.id,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        ELSE
            PERFORM log_project_activity(
                NEW.project_id,
                'status_changed',
                'Changed status for task: ' || NEW.title,
                NULL,
                NEW.id,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        END IF;
    END IF;
    
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        PERFORM log_project_activity(
            NEW.project_id,
            'priority_changed',
            'Changed priority for task: ' || NEW.title,
            NULL,
            NEW.id,
            jsonb_build_object('old_priority', OLD.priority, 'new_priority', NEW.priority)
        );
    END IF;
    
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
        PERFORM log_project_activity(
            NEW.project_id,
            'due_date_changed',
            'Changed due date for task: ' || NEW.title,
            NULL,
            NEW.id,
            jsonb_build_object('old_due_date', OLD.due_date, 'new_due_date', NEW.due_date)
        );
    END IF;
    
    -- Generic update if other fields changed
    IF OLD.title IS DISTINCT FROM NEW.title OR 
       OLD.description IS DISTINCT FROM NEW.description THEN
        PERFORM log_project_activity(
            NEW.project_id,
            'task_updated',
            'Updated task: ' || NEW.title,
            NULL,
            NEW.id,
            jsonb_build_object(
                'title_changed', OLD.title IS DISTINCT FROM NEW.title,
                'description_changed', OLD.description IS DISTINCT FROM NEW.description
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_task_updated
    AFTER UPDATE ON project_tasks
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION log_task_updated();

-- Trigger for project member additions
CREATE OR REPLACE FUNCTION log_member_added() RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_project_activity(
        NEW.project_id,
        'member_added',
        'Added member to project',
        NEW.user_id,
        NULL,
        jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_member_added
    AFTER INSERT ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_member_added();

-- Trigger for task assignee additions
CREATE OR REPLACE FUNCTION log_assignee_added() RETURNS TRIGGER AS $$
DECLARE
    task_title TEXT;
    project_id INTEGER;
BEGIN
    -- Get task title and project_id
    SELECT title, project_id INTO task_title, project_id
    FROM project_tasks
    WHERE id = NEW.task_id;
    
    PERFORM log_project_activity(
        project_id,
        'assignee_added',
        'Assigned user to task: ' || task_title,
        NEW.user_id,
        NEW.task_id,
        jsonb_build_object('task_title', task_title)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_assignee_added
    AFTER INSERT ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_assignee_added();

-- Trigger for task assignee removals
CREATE OR REPLACE FUNCTION log_assignee_removed() RETURNS TRIGGER AS $$
DECLARE
    task_title TEXT;
    project_id INTEGER;
BEGIN
    -- Get task title and project_id
    SELECT title, project_id INTO task_title, project_id
    FROM project_tasks
    WHERE id = OLD.task_id;
    
    PERFORM log_project_activity(
        project_id,
        'assignee_removed',
        'Removed user from task: ' || task_title,
        OLD.user_id,
        OLD.task_id,
        jsonb_build_object('task_title', task_title)
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_assignee_removed
    AFTER DELETE ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_assignee_removed();