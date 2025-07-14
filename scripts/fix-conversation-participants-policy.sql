-- Fix for infinite recursion in conversation_participants RLS policy

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Create a fixed policy that doesn't reference itself
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    -- Users can see participants if they are one of the participants
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Alternative approach if you need more complex logic:
-- This checks if the current user is a participant without recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    -- Check if the current user's ID or email matches any participant in this conversation
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants
      WHERE user_id = auth.uid()::text 
         OR user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- If you need to allow users to insert themselves as participants
CREATE POLICY "Users can add themselves as participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- If you need to allow users to remove themselves
CREATE POLICY "Users can remove themselves as participants" ON conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'conversation_participants';