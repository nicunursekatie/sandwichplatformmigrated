-- IMPORTANT: Run these commands one at a time to avoid deadlocks

-- Step 1: Enable RLS on each table individually
-- Run each ALTER TABLE command separately

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Wait a moment, then run:
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Continue with each table:
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Step 2: Create the helper function
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

-- Step 3: Create basic "allow authenticated users to read" policies
-- This ensures your app keeps working while we add more specific policies

CREATE POLICY "Authenticated users can read users" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read projects" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read messages" ON messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read hosts" ON hosts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read collections" ON collections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read drivers" ON drivers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read recipients" ON recipients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read conversations" ON conversations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read conversation_participants" ON conversation_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Step 4: Add admin policies for write operations
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can manage all hosts" ON hosts
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can manage all collections" ON collections
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can manage all drivers" ON drivers
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can manage all recipients" ON recipients
  FOR ALL USING (auth.user_role() = 'admin');

-- Step 5: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;