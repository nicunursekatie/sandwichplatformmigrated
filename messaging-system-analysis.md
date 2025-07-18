# Messaging System Analysis and Cleanup Plan

## Current Issues Identified

### 1. Database Schema Conflicts
- **Multiple Tables**: `messages`, `conversations`, `conversation_participants` 
- **Inconsistent Foreign Keys**: `messages.conversation_id` can be null, causing confusion between chat and inbox
- **No Read Tracking**: No system to track which messages have been read by which users
- **Missing Fields**: No proper sender/recipient fields for direct messages in inbox

### 2. Frontend Component Confusion
- **Chat Hub**: Uses multiple individual chat components (MessageLog, CommitteeChat, HostChat, etc.)
- **Inbox Page**: Tries to fetch direct messages but uses the same `messages` table without proper filtering
- **Overlap**: Both systems try to handle messaging but in different ways
- **No Real-time**: No Supabase realtime subscriptions despite being available

### 3. Hook Implementation Issues
- **useMessaging**: Placeholder implementation with TODOs for unread tracking
- **No Realtime**: Missing realtime subscriptions for live updates
- **Inconsistent Data**: Different components fetch messages differently

### 4. Notification System
- **MessageNotifications**: Only shows placeholder counts of 0
- **No Backend Logic**: No system to generate notifications on new messages
- **No Persistence**: Notifications aren't stored or tracked

## Proposed Solution Architecture

### 1. Clear Separation of Concerns

#### Real-time Chat Channels (chat-hub)
- **Purpose**: Real-time group discussions by role/permission
- **Database**: Use `conversations` table with `type = 'channel'`
- **Features**: Live updates, typing indicators, role-based access

#### Inbox System (inbox page)  
- **Purpose**: Email-like direct and group messaging
- **Database**: Use `conversations` table with `type = 'direct'` or `type = 'group'`
- **Features**: Read/unread status, threads, compose new messages

### 2. Unified Database Schema

#### Enhanced Messages Table
```sql
-- Add missing fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'chat';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id);
```

#### Message Read Tracking
```sql
-- Create separate table for read tracking
CREATE TABLE IF NOT EXISTS message_reads (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);
```

### 3. Realtime Implementation
- **Supabase Channels**: Subscribe to table changes for live updates
- **Typing Indicators**: Real-time presence system
- **Notification System**: Trigger notifications on new messages

### 4. Clear Component Structure

#### Chat System Components:
- `ChatHub` - Role-based channel selector
- `ChatChannel` - Individual channel with realtime messages
- `MessageInput` - Unified message composition

#### Inbox System Components:
- `InboxPage` - Message list and composition
- `ConversationView` - Thread view for selected conversation
- `MessageComposer` - Email-like message creation

## Implementation Plan

1. **Database Migration**: Fix schema and add missing tables/fields
2. **Realtime Setup**: Implement Supabase realtime subscriptions
3. **Chat System Cleanup**: Consolidate chat components and add realtime
4. **Inbox System Rebuild**: Create proper inbox with read tracking
5. **Notification System**: Implement proper notification generation and display
6. **Permission Integration**: Ensure proper role-based access control

This will create a clean separation between real-time chat (like Slack channels) and inbox messaging (like email), with proper notifications and read tracking throughout.