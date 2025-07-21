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

-- 4. Create a function to automatically mark sent messages as read
CREATE OR REPLACE FUNCTION mark_sent_messages_as_read()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new message being inserted, mark it as read for the sender
    IF TG_OP = 'INSERT' THEN
        NEW.is_read = FALSE; -- Messages start as unread for recipients
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically handle read status for new messages
DROP TRIGGER IF EXISTS messages_auto_read_trigger ON messages;
CREATE TRIGGER messages_auto_read_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION mark_sent_messages_as_read();

-- 6. Add RLS policies for messages if they don't exist
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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

COMMENT ON COLUMN messages.is_read IS 'Whether the message has been read by the recipient';
COMMENT ON COLUMN messages.recipient_id IS 'ID of the user who should receive this message';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when the message was marked as read';