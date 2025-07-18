-- Fix Messaging System Database Schema
-- This script adds missing fields and creates proper read tracking

-- 1. Add missing fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'chat';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';

-- 2. Create message read tracking table
CREATE TABLE IF NOT EXISTS message_reads (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);

-- 4. Enable RLS on message_reads table
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for message_reads
DROP POLICY IF EXISTS "Users can view their own message reads" ON message_reads;
CREATE POLICY "Users can view their own message reads" ON message_reads
FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert their own message reads" ON message_reads;
CREATE POLICY "Users can insert their own message reads" ON message_reads
FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own message reads" ON message_reads;
CREATE POLICY "Users can update their own message reads" ON message_reads
FOR UPDATE USING (user_id = auth.uid()::text);

-- 6. Create default chat channels in conversations table
INSERT INTO conversations (type, name) VALUES 
('channel', 'general')
ON CONFLICT DO NOTHING;

INSERT INTO conversations (type, name) VALUES 
('channel', 'committee')
ON CONFLICT DO NOTHING;

INSERT INTO conversations (type, name) VALUES 
('channel', 'hosts')
ON CONFLICT DO NOTHING;

INSERT INTO conversations (type, name) VALUES 
('channel', 'drivers')
ON CONFLICT DO NOTHING;

INSERT INTO conversations (type, name) VALUES 
('channel', 'recipients')
ON CONFLICT DO NOTHING;

INSERT INTO conversations (type, name) VALUES 
('channel', 'core_team')
ON CONFLICT DO NOTHING;

-- 7. Update existing messages to have proper conversation_ids for chat channels
UPDATE messages 
SET conversation_id = (SELECT id FROM conversations WHERE name = 'general' AND type = 'channel' LIMIT 1),
    message_type = 'chat'
WHERE conversation_id IS NULL AND message_type IS NULL;

COMMENT ON TABLE message_reads IS 'Tracks which messages have been read by which users';
COMMENT ON TABLE messages IS 'Enhanced messages table with proper typing and threading support';