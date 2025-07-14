-- Simple fix for conversation_participants infinite recursion

-- First, disable RLS temporarily to clean up
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves as participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves as participants" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can read conversation_participants" ON conversation_participants;

-- Re-enable RLS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- OPTION 1: Simple authenticated access (recommended for most apps)
-- This allows any authenticated user to see participants
CREATE POLICY "Authenticated users can view participants" ON conversation_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- OPTION 2: If you need more restrictive access based on conversation type
-- This checks the conversation type without recursion
-- CREATE POLICY "Users can view participants by conversation type" ON conversation_participants
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM conversations c
--       WHERE c.id = conversation_participants.conversation_id
--       AND (
--         -- Public conversations everyone can see
--         c.type = 'channel' OR
--         -- Direct/group conversations - would need additional logic
--         (c.type IN ('direct', 'group') AND auth.uid() IS NOT NULL)
--       )
--     )
--   );

-- Users can only add themselves as participants
CREATE POLICY "Users can add themselves as participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can only remove themselves
CREATE POLICY "Users can remove themselves as participants" ON conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update their own participant records (e.g., last_read_at)
CREATE POLICY "Users can update their own participant records" ON conversation_participants
  FOR UPDATE USING (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'conversation_participants'
ORDER BY cmd;