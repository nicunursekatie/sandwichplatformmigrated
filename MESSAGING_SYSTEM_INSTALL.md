# 📬 Messaging System Installation Guide

## Overview
Your messaging and chat system has been completely rebuilt to provide:
- **Real-time Chat Channels**: Role-based team communication (like Slack)
- **Inbox System**: Email-like direct and group messaging
- **Proper Notifications**: Real unread counts and live updates
- **Clean Separation**: No more confusion between chat and inbox

## ⚡ Quick Setup (Required)

### Step 1: Run Database Migration
Copy and paste this SQL into your **Supabase Dashboard → SQL Editor**:

```sql
-- Fix Messaging System Database Schema
-- Run this entire script in one go

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

-- 6. Create default chat channels
INSERT INTO conversations (type, name) VALUES 
('channel', 'general'),
('channel', 'committee'),
('channel', 'hosts'),
('channel', 'drivers'),
('channel', 'recipients'),
('channel', 'core_team')
ON CONFLICT DO NOTHING;

-- 7. Update existing messages to use general chat
UPDATE messages 
SET conversation_id = (SELECT id FROM conversations WHERE name = 'general' AND type = 'channel' LIMIT 1),
    message_type = 'chat'
WHERE conversation_id IS NULL;
```

### Step 2: Verify Installation
1. Go to your app's **Messages** section
2. You should see chat channels based on your role permissions
3. Try sending a message in any channel
4. Go to **Inbox** section
5. Try composing a new direct message

## 🎯 What You Get

### Chat Channels (Messages Section)
- **Real-time messaging** in role-based channels
- **Live connection status** indicator
- **Unread message counts** per channel
- **Reply threading** within messages
- **Auto-scroll** to new messages

### Inbox System (Inbox Section) 
- **Direct messaging** between users
- **Group messaging** for multiple recipients
- **Subject lines** and priority levels
- **Read/unread status** tracking
- **Proper reply functionality**

### Notifications
- **Bell icon** shows total unread count
- **Per-channel breakdown** of unread messages
- **Live status** indicator (connected/disconnected)
- **Recent message previews**

## 🔧 Features by Role

| Role | General | Committee | Hosts | Drivers | Recipients | Core Team |
|------|---------|-----------|-------|---------|------------|-----------|
| **Volunteer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Committee** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Host** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Driver** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Recipient** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*All roles can access the inbox for direct/group messaging*

## 📱 User Interface

### Chat Interface
```
┌─ Messages ─────────────────────────────────┐
│ 🟢 Connected                               │
├────────────────────────────────────────────┤
│ Channels          │ # general             │
│ # general     (3) │ ┌─────────────────────┤
│ # hosts       (1) │ │ John: Hey everyone! │
│ # core_team   (2) │ │ ┌─ Reply to John ──┤
│                   │ │ │ Alice: Hi there! │
│                   │ │ └─────────────────────┤
│                   │ │ [Type message...]    │
└───────────────────┴─┴─────────────────────┘
```

### Inbox Interface
```
┌─ Inbox ────────────────────────────────────┐
│ [🔍 Search] [➕ New Message]              │
├─ All | Unread | Sent | Direct | Group ────┤
│ Message List      │ Selected Message       │
│ ✉️ John Doe       │ Subject: Project Update│
│ 🔵 New Project... │ From: John • 2h ago    │
│ ✉️ Team Meeting   │ ┌─────────────────────┤
│ ✉️ Alice Smith    │ │ Message content...  │
│                   │ │                     │
│                   │ │ [Reply box...]      │
└───────────────────┴─┴─────────────────────┘
```

## 🚨 Troubleshooting

### "Channel not found" Error
- **Cause**: Database migration didn't run completely
- **Solution**: Re-run the SQL migration script above

### Messages Not Appearing in Real-time
- **Cause**: Supabase realtime not enabled
- **Solution**: Check Supabase Dashboard → Settings → API → Realtime is enabled

### Unread Counts Not Updating
- **Cause**: `message_reads` table missing or RLS policies incorrect
- **Solution**: Verify the migration created the table and policies

### Permission Errors
- **Cause**: User roles not properly set
- **Solution**: Check user permissions in the `users` table

## 📋 Migration Verification

After running the SQL, verify these were created:

**New columns in `messages` table:**
- `message_type` (VARCHAR)
- `reply_to_id` (INTEGER) 
- `recipient_id` (TEXT)
- `subject` (TEXT)
- `priority` (VARCHAR)
- `status` (VARCHAR)

**New `message_reads` table:**
- `id` (Primary key)
- `message_id` (Foreign key to messages)
- `user_id` (TEXT)
- `read_at` (TIMESTAMP)

**Chat channels in `conversations` table:**
- general, committee, hosts, drivers, recipients, core_team

## 🎉 Success!

Once the migration is complete, your team will have:
- ✅ **Separated systems** for chat vs inbox
- ✅ **Real-time messaging** with live updates  
- ✅ **Proper notifications** showing actual unread counts
- ✅ **Role-based access** to appropriate channels
- ✅ **Professional inbox** with subjects and priorities

The old confusing system is gone, replaced with a clean, modern messaging experience!