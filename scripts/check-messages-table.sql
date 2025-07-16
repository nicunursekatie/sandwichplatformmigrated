-- Check if messages table exists and its structure

-- 1. Check if messages table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
) as messages_table_exists;

-- 2. If it exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 3. Check for conversations table
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
) as conversations_table_exists;

-- 4. Check the kudos_tracking table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'kudos_tracking'
ORDER BY ordinal_position;

-- 5. See if there are any kudos records
SELECT 
    kt.*,
    sender.first_name as sender_name,
    recipient.first_name as recipient_name
FROM kudos_tracking kt
LEFT JOIN users sender ON sender.id = kt.sender_id
LEFT JOIN users recipient ON recipient.id = kt.recipient_id
ORDER BY kt.sent_at DESC
LIMIT 10;