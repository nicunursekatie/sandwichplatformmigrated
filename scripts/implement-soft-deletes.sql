-- Soft Delete Migration Script
-- This script adds deleted_at columns to all major tables and sets up soft delete infrastructure

-- Add deleted_at columns to all major tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE project_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_comments ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE committees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE committee_memberships ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE committee_memberships ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE kudos_tracking ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE kudos_tracking ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE sandwich_collections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sandwich_collections ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE drive_links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE drive_links ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE driver_agreements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE driver_agreements ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE hosts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE host_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE host_contacts ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE recipients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE hosted_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hosted_files ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

ALTER TABLE suggestion_responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE suggestion_responses ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Create indexes for soft delete queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_tasks_deleted_at ON project_tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sandwich_collections_deleted_at ON sandwich_collections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hosts_deleted_at ON hosts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_deleted_at ON drivers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_deleted_at ON recipients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suggestions_deleted_at ON suggestions(deleted_at) WHERE deleted_at IS NULL;

-- Create a function to get current user ID (for RLS policies)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set current user ID
CREATE OR REPLACE FUNCTION set_current_user_id(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = get_current_user_id() AND deleted_at IS NULL;
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = get_current_user_id() AND deleted_at IS NULL;
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all major tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandwich_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosted_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_responses ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN users.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN users.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN projects.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN projects.deleted_by IS 'User ID who performed the soft delete';

-- Create audit log for tracking all deletions
CREATE TABLE IF NOT EXISTS deletion_audit (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_by VARCHAR(255) NOT NULL,
  deletion_reason TEXT,
  record_data JSONB, -- Store the full record data before deletion
  can_restore BOOLEAN DEFAULT true,
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_table_record ON deletion_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_by ON deletion_audit(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON deletion_audit(deleted_at);

COMMENT ON TABLE deletion_audit IS 'Audit trail for all soft deletions in the system'; 