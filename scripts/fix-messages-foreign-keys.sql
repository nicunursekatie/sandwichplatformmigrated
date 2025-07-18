-- Fix foreign key relationships for messages table

-- First, check if the foreign keys already exist
DO $$ 
BEGIN
    -- Add foreign key for user_id (sender)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_user_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for recipient_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_recipient_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_recipient_id_fkey 
        FOREIGN KEY (recipient_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for conversation_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_conversation_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_conversation_id_fkey 
        FOREIGN KEY (conversation_id) 
        REFERENCES public.conversations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Verify the foreign keys were created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'messages';