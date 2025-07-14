-- Fix the recursive policy issue for conversation_participants

-- Drop the existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves as participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves as participants" ON conversation_participants;

-- Create new non-recursive policies

-- For SELECT: Users can see ALL participants of conversations where they are a participant
-- This is non-recursive because we're only checking the current row
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    -- Allow users to see all participants in conversations where the current user is also a participant
    -- We'll check this at the conversation level, not by querying participants again
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND (
        -- Check if user created the conversation
        c.created_by = auth.uid()::text OR
        c.created_by = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        -- Or check if it's a public conversation type (general, committee, etc)
        c.type IN ('general', 'committee', 'host', 'driver', 'recipient', 'core_team')
      )
    )
  );

-- Alternative simpler approach - just let authenticated users see all participants
-- This avoids recursion entirely
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

CREATE POLICY "Authenticated users can view participants" ON conversation_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- For INSERT: Users can only add themselves
CREATE POLICY "Users can add themselves as participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- For DELETE: Users can only remove themselves  
CREATE POLICY "Users can remove themselves as participants" ON conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()::text OR
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'conversation_participants';