-- RLS Policies for Soft Delete System
-- This script creates Row Level Security policies that automatically filter out soft-deleted records

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view non-deleted users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Super admins can soft delete users" ON users;

DROP POLICY IF EXISTS "Users can view non-deleted projects" ON projects;
DROP POLICY IF EXISTS "Users can manage assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
DROP POLICY IF EXISTS "Users can soft delete owned projects" ON projects;

DROP POLICY IF EXISTS "Users can view non-deleted tasks" ON project_tasks;
DROP POLICY IF EXISTS "Users can manage assigned tasks" ON project_tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON project_tasks;

DROP POLICY IF EXISTS "Users can view non-deleted messages" ON messages;
DROP POLICY IF EXISTS "Users can manage their own messages" ON messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON messages;

-- Users table policies
CREATE POLICY "Users can view non-deleted users" ON users
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE
  USING (id = get_current_user_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  USING (is_admin() OR id = get_current_user_id());

CREATE POLICY "Super admins can soft delete users" ON users
  FOR UPDATE
  USING (is_super_admin());

-- Projects table policies
CREATE POLICY "Users can view non-deleted projects" ON projects
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage assigned projects" ON projects
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      assignee_ids::jsonb ? get_current_user_id() OR
      EXISTS (
        SELECT 1 FROM project_assignments pa 
        WHERE pa.project_id = projects.id 
        AND pa.user_id = get_current_user_id() 
        AND pa.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL
  USING (is_admin());

CREATE POLICY "Users can soft delete owned projects" ON projects
  FOR UPDATE
  USING (
    assignee_ids::jsonb ? get_current_user_id() OR
    EXISTS (
      SELECT 1 FROM project_assignments pa 
      WHERE pa.project_id = projects.id 
      AND pa.user_id = get_current_user_id() 
      AND pa.role = 'owner'
      AND pa.deleted_at IS NULL
    ) OR
    is_admin()
  );

-- Project tasks table policies
CREATE POLICY "Users can view non-deleted tasks" ON project_tasks
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_tasks.project_id 
      AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage assigned tasks" ON project_tasks
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      assignee_ids::text[] && ARRAY[get_current_user_id()] OR
      EXISTS (
        SELECT 1 FROM project_assignments pa 
        WHERE pa.project_id = project_tasks.project_id 
        AND pa.user_id = get_current_user_id() 
        AND pa.deleted_at IS NULL
      ) OR
      is_admin()
    )
  );

CREATE POLICY "Admins can manage all tasks" ON project_tasks
  FOR ALL
  USING (is_admin());

-- Project comments table policies
CREATE POLICY "Users can view non-deleted comments" ON project_comments
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_comments.project_id 
      AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage their own comments" ON project_comments
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      author_name = (SELECT display_name FROM users WHERE id = get_current_user_id()) OR
      is_admin()
    )
  );

-- Task completions table policies
CREATE POLICY "Users can view non-deleted completions" ON task_completions
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_tasks pt 
      WHERE pt.id = task_completions.task_id 
      AND pt.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage their own completions" ON task_completions
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Project assignments table policies
CREATE POLICY "Users can view non-deleted assignments" ON project_assignments
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their own assignments" ON project_assignments
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Messages table policies (already has deleted_at)
CREATE POLICY "Users can view non-deleted messages" ON messages
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      sender_id = get_current_user_id() OR
      EXISTS (
        SELECT 1 FROM conversation_participants cp 
        WHERE cp.conversation_id = messages.conversation_id 
        AND cp.user_id = get_current_user_id()
        AND cp.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Users can manage their own messages" ON messages
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      sender_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Conversations table policies
CREATE POLICY "Users can view non-deleted conversations" ON conversations
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = get_current_user_id()
      AND cp.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage their conversations" ON conversations
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      EXISTS (
        SELECT 1 FROM conversation_participants cp 
        WHERE cp.conversation_id = conversations.id 
        AND cp.user_id = get_current_user_id()
        AND cp.deleted_at IS NULL
      ) OR
      is_admin()
    )
  );

-- Conversation participants table policies
CREATE POLICY "Users can view non-deleted participants" ON conversation_participants
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      EXISTS (
        SELECT 1 FROM conversation_participants cp2 
        WHERE cp2.conversation_id = conversation_participants.conversation_id 
        AND cp2.user_id = get_current_user_id()
        AND cp2.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Users can manage their own participation" ON conversation_participants
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Sandwich collections table policies
CREATE POLICY "Users can view non-deleted collections" ON sandwich_collections
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage collections" ON sandwich_collections
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      is_admin() OR
      TRUE -- Allow all authenticated users to manage collections for now
    )
  );

-- Hosts table policies
CREATE POLICY "Users can view non-deleted hosts" ON hosts
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage hosts" ON hosts
  FOR ALL
  USING (is_admin());

-- Drivers table policies
CREATE POLICY "Users can view non-deleted drivers" ON drivers
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage drivers" ON drivers
  FOR ALL
  USING (is_admin());

-- Recipients table policies
CREATE POLICY "Users can view non-deleted recipients" ON recipients
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage recipients" ON recipients
  FOR ALL
  USING (is_admin());

-- Contacts table policies
CREATE POLICY "Users can view non-deleted contacts" ON contacts
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage contacts" ON contacts
  FOR ALL
  USING (is_admin());

-- Suggestions table policies
CREATE POLICY "Users can view non-deleted suggestions" ON suggestions
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their own suggestions" ON suggestions
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      submitted_by = get_current_user_id() OR
      is_admin()
    )
  );

-- Meetings table policies
CREATE POLICY "Users can view non-deleted meetings" ON meetings
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage meetings" ON meetings
  FOR ALL
  USING (is_admin());

-- Meeting minutes table policies
CREATE POLICY "Users can view non-deleted minutes" ON meeting_minutes
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage minutes" ON meeting_minutes
  FOR ALL
  USING (is_admin());

-- Work logs table policies
CREATE POLICY "Users can view their own work logs" ON work_logs
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      visibility = 'public' OR
      (visibility = 'team' AND shared_with::jsonb ? get_current_user_id()) OR
      is_admin()
    )
  );

CREATE POLICY "Users can manage their own work logs" ON work_logs
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Notifications table policies
CREATE POLICY "Users can view non-deleted notifications" ON notifications
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage notifications" ON notifications
  FOR ALL
  USING (
    deleted_at IS NULL AND
    (recipient_id = get_current_user_id() OR is_admin() OR is_super_admin())
  );

-- Committees table policies
CREATE POLICY "Users can view non-deleted committees" ON committees
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage committees" ON committees
  FOR ALL
  USING (is_admin());

-- Committee memberships table policies
CREATE POLICY "Users can view non-deleted memberships" ON committee_memberships
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their own memberships" ON committee_memberships
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      user_id = get_current_user_id() OR
      is_admin()
    )
  );

-- Announcements table policies
CREATE POLICY "Users can view active announcements" ON announcements
  FOR SELECT
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL
  USING (is_admin());

-- Additional utility policies for other tables
CREATE POLICY "Users can view non-deleted message recipients" ON message_recipients
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    recipient_id = get_current_user_id()
  );

CREATE POLICY "Users can manage their message recipients" ON message_recipients
  FOR ALL
  USING (
    deleted_at IS NULL AND (
      recipient_id = get_current_user_id() OR
      is_admin()
    )
  );

CREATE POLICY "Users can view non-deleted message threads" ON message_threads
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can view non-deleted kudos" ON kudos_tracking
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can view non-deleted reports" ON weekly_reports
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can view non-deleted drive links" ON drive_links
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can view non-deleted agenda items" ON agenda_items
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can view non-deleted hosted files" ON hosted_files
  FOR SELECT
  USING (deleted_at IS NULL AND is_public = true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant additional permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON SCHEMA public IS 'RLS policies configured for soft delete system';