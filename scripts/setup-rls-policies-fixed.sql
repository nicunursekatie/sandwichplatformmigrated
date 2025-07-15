-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create a function to get user role from auth.users metadata
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT raw_user_meta_data->>'role' 
     FROM auth.users 
     WHERE id = auth.uid()),
    'viewer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES
-- Everyone can read users (for directory, chat, etc)
CREATE POLICY "Users are viewable by authenticated users" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update their own profile (match by id)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Admins can manage all users
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (auth.user_role() = 'admin');

-- PROJECTS TABLE POLICIES
-- Everyone can view projects
CREATE POLICY "Projects are viewable by authenticated users" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage projects
CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL USING (auth.user_role() = 'admin');

-- Project creators can update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (
    created_by = auth.uid()::text OR
    created_by = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- MESSAGES TABLE POLICIES
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND (
        conversation_participants.user_id = auth.uid()::text OR
        conversation_participants.user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND (
        conversation_participants.user_id = auth.uid()::text OR
        conversation_participants.user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- HOSTS TABLE POLICIES
-- Everyone can view hosts
CREATE POLICY "Hosts are viewable by authenticated users" ON hosts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage hosts
CREATE POLICY "Admins can manage hosts" ON hosts
  FOR ALL USING (auth.user_role() = 'admin');

-- COLLECTIONS TABLE POLICIES
-- Everyone can view collections
CREATE POLICY "Collections are viewable by authenticated users" ON collections
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins and drivers can create collections
CREATE POLICY "Admins and drivers can create collections" ON collections
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('admin', 'driver')
  );

-- Admins can update/delete collections
CREATE POLICY "Admins can manage collections" ON collections
  FOR ALL USING (auth.user_role() = 'admin');

-- CONVERSATIONS TABLE POLICIES
-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND (
        conversation_participants.user_id = auth.uid()::text OR
        conversation_participants.user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CONVERSATION PARTICIPANTS POLICIES
-- Users can view participants of conversations they're in
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND (
        cp.user_id = auth.uid()::text OR
        cp.user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION auth.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  -- Get permissions from auth.users metadata
  SELECT raw_user_meta_data->'permissions'
  INTO user_permissions
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if required permission exists in user's permissions array
  IF user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN user_permissions ? required_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;