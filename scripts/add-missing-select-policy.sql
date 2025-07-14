-- Add the missing SELECT policy for conversation_participants

-- Check if the SELECT policy exists
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'conversation_participants' 
AND cmd = 'SELECT';

-- Add the missing SELECT policy
CREATE POLICY "Authenticated users can view participants" ON conversation_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Verify all policies are now in place
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'conversation_participants'
ORDER BY cmd;

-- The complete set should be:
-- DELETE: Users can remove themselves
-- INSERT: Users can add themselves  
-- SELECT: Authenticated users can view participants (THIS WAS MISSING!)
-- UPDATE: Users can update their own records