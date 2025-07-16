-- Add missing foreign key constraints to kudos_tracking table

-- Add foreign key for sender_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kudos_tracking_sender_id_fkey'
    ) THEN
        ALTER TABLE kudos_tracking 
        ADD CONSTRAINT kudos_tracking_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES users(id);
    END IF;
END $$;

-- Add foreign key for recipient_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kudos_tracking_recipient_id_fkey'
    ) THEN
        ALTER TABLE kudos_tracking 
        ADD CONSTRAINT kudos_tracking_recipient_id_fkey 
        FOREIGN KEY (recipient_id) REFERENCES users(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kudos_sender ON kudos_tracking(sender_id);
CREATE INDEX IF NOT EXISTS idx_kudos_recipient ON kudos_tracking(recipient_id);
CREATE INDEX IF NOT EXISTS idx_kudos_context ON kudos_tracking(context_type, context_id);

-- Verify the constraints were created
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'kudos_tracking'::regclass
ORDER BY conname;