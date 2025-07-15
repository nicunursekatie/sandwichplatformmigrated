-- Fix RLS policies for user profile updates
-- This script corrects the user profile update policy to use the correct column name

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create the correct policy that matches users by their ID
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Also ensure users can insert their own profile data if needed
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Verify the policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname LIKE '%profile%'; 