# Fix Inbox Read Tracking - Manual Migration Instructions

## Problem
The inbox is showing incorrect unread message counts (7 in inbox vs 4 in navigation) and messages are not being marked as read when clicked. This is because:

1. The `messages` table is missing the `is_read` field
2. The `messages` table is missing the `recipient_id` field for proper targeting
3. There's no proper read tracking mechanism

## Solution: Manual Database Migration

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Navigate to your project: `mifquzfaqtcyboqntfyn`
3. Go to the **SQL Editor** in the left sidebar

### Step 2: Execute Migration SQL

Copy and paste this SQL into the SQL Editor and run it:

```sql
-- Fix Inbox Read Tracking Issues
-- This script adds proper read tracking to the messages table

-- 1. Add missing fields to messages table if they don't exist
DO $$ 
BEGIN
    -- Add is_read field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add recipient_id field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
        ALTER TABLE messages ADD COLUMN recipient_id TEXT;
    END IF;
    
    -- Add message_type field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'direct';
    END IF;
    
    -- Add subject field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'subject') THEN
        ALTER TABLE messages ADD COLUMN subject TEXT;
    END IF;
    
    -- Add priority field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'priority') THEN
        ALTER TABLE messages ADD COLUMN priority VARCHAR(10) DEFAULT 'normal';
    END IF;
    
    -- Add read_at field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'read_at') THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
    END IF;
END $$;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id_is_read ON messages(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_is_read ON messages(recipient_id, is_read) WHERE recipient_id IS NOT NULL;

-- 3. Mark all existing messages as read to avoid false unread counts
-- Messages sent by users should be marked as read by default
UPDATE messages SET is_read = TRUE WHERE is_read IS NULL OR is_read = FALSE;

-- 4. Add RLS policies for messages if they don't exist
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (this is safe)
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages they received to mark as read" ON messages;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view messages they sent or received" ON messages
FOR SELECT USING (
    user_id = auth.uid()::text OR 
    recipient_id = auth.uid()::text OR
    recipient_id IS NULL
);

CREATE POLICY "Users can insert their own messages" ON messages
FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update messages they received to mark as read" ON messages
FOR UPDATE USING (
    recipient_id = auth.uid()::text OR 
    (recipient_id IS NULL AND user_id != auth.uid()::text)
) WITH CHECK (
    recipient_id = auth.uid()::text OR 
    (recipient_id IS NULL AND user_id != auth.uid()::text)
);
```

### Step 3: Verify Migration

After running the SQL, execute this query to verify the new columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('is_read', 'recipient_id', 'message_type', 'subject', 'priority', 'read_at')
ORDER BY column_name;
```

You should see all 6 new columns listed.

### Step 4: Test the Fix

1. Refresh your application
2. Send a new direct message
3. Check that the unread count in the navigation matches the inbox
4. Click on a message to view it - it should be marked as read
5. The unread count should decrease accordingly

## What This Migration Does

✅ **Adds `is_read` column** - Tracks whether each message has been read
✅ **Adds `recipient_id` column** - Properly targets direct messages to specific users  
✅ **Adds `message_type` column** - Distinguishes between 'direct', 'group', and 'chat' messages
✅ **Adds `subject` column** - Allows messages to have subjects
✅ **Adds `priority` column** - Supports message priority levels
✅ **Adds `read_at` column** - Timestamps when messages were read
✅ **Creates performance indexes** - Optimizes queries for read status and recipients
✅ **Sets up RLS policies** - Ensures users can only see and modify appropriate messages
✅ **Marks existing messages as read** - Prevents false unread counts from old data

## Expected Results

After the migration:
- ✅ Inbox unread count will match navigation unread count
- ✅ Messages will be marked as read when clicked
- ✅ Only received messages (not sent messages) count toward unread totals
- ✅ Search functionality will work properly in inbox
- ✅ Message filtering by type (direct/group) will work
- ✅ Performance will be improved with proper indexes