-- Audit Triggers for Soft Delete System
-- This script creates triggers that automatically log all deletions and changes to audit tables

-- Create a generic trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  action_type TEXT;
  current_user_id TEXT;
BEGIN
  -- Get current user from session
  current_user_id := get_current_user_id();
  
  -- Determine action type
  IF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
    old_data := NULL;
    new_data := to_jsonb(NEW);
  END IF;
  
  -- Log to audit_logs table
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    user_id,
    session_id
  ) VALUES (
    action_type,
    TG_TABLE_NAME,
    COALESCE(
      (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::TEXT,
      'unknown'
    ),
    old_data,
    new_data,
    current_user_id,
    current_setting('app.session_id', true)
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a specific trigger function for soft deletions
CREATE OR REPLACE FUNCTION soft_delete_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id TEXT;
BEGIN
  -- Get current user from session
  current_user_id := get_current_user_id();
  
  -- Only log if this is a soft delete (deleted_at is being set)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Log to deletion_audit table
    INSERT INTO deletion_audit (
      table_name,
      record_id,
      deleted_at,
      deleted_by,
      deletion_reason,
      record_data,
      can_restore
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      NEW.deleted_at,
      COALESCE(NEW.deleted_by, current_user_id),
      'Soft delete via application',
      to_jsonb(OLD),
      true
    );
  END IF;
  
  -- If this is a restore (deleted_at is being cleared)
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Update deletion_audit table
    UPDATE deletion_audit
    SET 
      restored_at = NOW(),
      restored_by = current_user_id
    WHERE 
      table_name = TG_TABLE_NAME 
      AND record_id = NEW.id::TEXT
      AND restored_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all major tables
-- Users table
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS users_soft_delete_audit_trigger ON users;
CREATE TRIGGER users_soft_delete_audit_trigger
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Projects table
DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS projects_soft_delete_audit_trigger ON projects;
CREATE TRIGGER projects_soft_delete_audit_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Project tasks table
DROP TRIGGER IF EXISTS project_tasks_audit_trigger ON project_tasks;
CREATE TRIGGER project_tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS project_tasks_soft_delete_audit_trigger ON project_tasks;
CREATE TRIGGER project_tasks_soft_delete_audit_trigger
  AFTER UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Messages table
DROP TRIGGER IF EXISTS messages_audit_trigger ON messages;
CREATE TRIGGER messages_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS messages_soft_delete_audit_trigger ON messages;
CREATE TRIGGER messages_soft_delete_audit_trigger
  AFTER UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Sandwich collections table
DROP TRIGGER IF EXISTS sandwich_collections_audit_trigger ON sandwich_collections;
CREATE TRIGGER sandwich_collections_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sandwich_collections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS sandwich_collections_soft_delete_audit_trigger ON sandwich_collections;
CREATE TRIGGER sandwich_collections_soft_delete_audit_trigger
  AFTER UPDATE ON sandwich_collections
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Hosts table
DROP TRIGGER IF EXISTS hosts_audit_trigger ON hosts;
CREATE TRIGGER hosts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hosts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS hosts_soft_delete_audit_trigger ON hosts;
CREATE TRIGGER hosts_soft_delete_audit_trigger
  AFTER UPDATE ON hosts
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Drivers table
DROP TRIGGER IF EXISTS drivers_audit_trigger ON drivers;
CREATE TRIGGER drivers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON drivers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS drivers_soft_delete_audit_trigger ON drivers;
CREATE TRIGGER drivers_soft_delete_audit_trigger
  AFTER UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Recipients table
DROP TRIGGER IF EXISTS recipients_audit_trigger ON recipients;
CREATE TRIGGER recipients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON recipients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS recipients_soft_delete_audit_trigger ON recipients;
CREATE TRIGGER recipients_soft_delete_audit_trigger
  AFTER UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Contacts table
DROP TRIGGER IF EXISTS contacts_audit_trigger ON contacts;
CREATE TRIGGER contacts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS contacts_soft_delete_audit_trigger ON contacts;
CREATE TRIGGER contacts_soft_delete_audit_trigger
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Suggestions table
DROP TRIGGER IF EXISTS suggestions_audit_trigger ON suggestions;
CREATE TRIGGER suggestions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS suggestions_soft_delete_audit_trigger ON suggestions;
CREATE TRIGGER suggestions_soft_delete_audit_trigger
  AFTER UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Meetings table
DROP TRIGGER IF EXISTS meetings_audit_trigger ON meetings;
CREATE TRIGGER meetings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS meetings_soft_delete_audit_trigger ON meetings;
CREATE TRIGGER meetings_soft_delete_audit_trigger
  AFTER UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Work logs table
DROP TRIGGER IF EXISTS work_logs_audit_trigger ON work_logs;
CREATE TRIGGER work_logs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS work_logs_soft_delete_audit_trigger ON work_logs;
CREATE TRIGGER work_logs_soft_delete_audit_trigger
  AFTER UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Notifications table
DROP TRIGGER IF EXISTS notifications_audit_trigger ON notifications;
CREATE TRIGGER notifications_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS notifications_soft_delete_audit_trigger ON notifications;
CREATE TRIGGER notifications_soft_delete_audit_trigger
  AFTER UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Committees table
DROP TRIGGER IF EXISTS committees_audit_trigger ON committees;
CREATE TRIGGER committees_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON committees
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS committees_soft_delete_audit_trigger ON committees;
CREATE TRIGGER committees_soft_delete_audit_trigger
  AFTER UPDATE ON committees
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Committee memberships table
DROP TRIGGER IF EXISTS committee_memberships_audit_trigger ON committee_memberships;
CREATE TRIGGER committee_memberships_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON committee_memberships
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS committee_memberships_soft_delete_audit_trigger ON committee_memberships;
CREATE TRIGGER committee_memberships_soft_delete_audit_trigger
  AFTER UPDATE ON committee_memberships
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Announcements table
DROP TRIGGER IF EXISTS announcements_audit_trigger ON announcements;
CREATE TRIGGER announcements_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON announcements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS announcements_soft_delete_audit_trigger ON announcements;
CREATE TRIGGER announcements_soft_delete_audit_trigger
  AFTER UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Conversations table
DROP TRIGGER IF EXISTS conversations_audit_trigger ON conversations;
CREATE TRIGGER conversations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON conversations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS conversations_soft_delete_audit_trigger ON conversations;
CREATE TRIGGER conversations_soft_delete_audit_trigger
  AFTER UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION soft_delete_audit_trigger_function();

-- Create helper functions for common audit queries
CREATE OR REPLACE FUNCTION get_deletion_history(
  table_name_param TEXT,
  record_id_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  table_name VARCHAR,
  record_id VARCHAR,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR,
  deletion_reason TEXT,
  record_data JSONB,
  can_restore BOOLEAN,
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM deletion_audit da
  WHERE da.table_name = table_name_param
    AND (record_id_param IS NULL OR da.record_id = record_id_param)
  ORDER BY da.deleted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_audit_trail(
  table_name_param TEXT,
  record_id_param TEXT DEFAULT NULL,
  limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
  id INTEGER,
  action VARCHAR,
  table_name VARCHAR,
  record_id VARCHAR,
  old_data TEXT,
  new_data TEXT,
  user_id VARCHAR,
  timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.table_name,
    al.record_id,
    al.old_data,
    al.new_data,
    al.user_id,
    al.timestamp
  FROM audit_logs al
  WHERE al.table_name = table_name_param
    AND (record_id_param IS NULL OR al.record_id = record_id_param)
  ORDER BY al.timestamp DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore soft-deleted records
CREATE OR REPLACE FUNCTION restore_soft_deleted_record(
  table_name_param TEXT,
  record_id_param TEXT,
  restore_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  sql_query TEXT;
  result BOOLEAN := false;
BEGIN
  -- Security check - only admins can restore
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can restore deleted records';
  END IF;
  
  -- Build dynamic SQL to restore the record
  sql_query := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = %L AND deleted_at IS NOT NULL',
    table_name_param,
    record_id_param
  );
  
  -- Execute the restore
  EXECUTE sql_query;
  
  -- Check if any rows were affected
  GET DIAGNOSTICS result = ROW_COUNT;
  
  -- Update deletion audit log
  IF result THEN
    UPDATE deletion_audit
    SET 
      restored_at = NOW(),
      restored_by = restore_user_id
    WHERE 
      table_name = table_name_param 
      AND record_id = record_id_param
      AND restored_at IS NULL;
  END IF;
  
  RETURN result > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to permanently delete soft-deleted records (admin only)
CREATE OR REPLACE FUNCTION permanently_delete_record(
  table_name_param TEXT,
  record_id_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  sql_query TEXT;
  result BOOLEAN := false;
BEGIN
  -- Security check - only super admins can permanently delete
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete records';
  END IF;
  
  -- Build dynamic SQL to permanently delete the record
  sql_query := format(
    'DELETE FROM %I WHERE id = %L AND deleted_at IS NOT NULL',
    table_name_param,
    record_id_param
  );
  
  -- Execute the permanent deletion
  EXECUTE sql_query;
  
  -- Check if any rows were affected
  GET DIAGNOSTICS result = ROW_COUNT;
  
  -- Update deletion audit log
  IF result THEN
    UPDATE deletion_audit
    SET can_restore = false
    WHERE 
      table_name = table_name_param 
      AND record_id = record_id_param;
  END IF;
  
  RETURN result > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_function() IS 'Generic trigger function for logging all database changes';
COMMENT ON FUNCTION soft_delete_audit_trigger_function() IS 'Specialized trigger function for logging soft deletions';
COMMENT ON FUNCTION get_deletion_history(TEXT, TEXT) IS 'Retrieve deletion history for a table or specific record';
COMMENT ON FUNCTION get_audit_trail(TEXT, TEXT, INTEGER) IS 'Retrieve full audit trail for a table or specific record';
COMMENT ON FUNCTION restore_soft_deleted_record(TEXT, TEXT, TEXT) IS 'Restore a soft-deleted record (admin only)';
COMMENT ON FUNCTION permanently_delete_record(TEXT, TEXT) IS 'Permanently delete a soft-deleted record (super admin only)'; 