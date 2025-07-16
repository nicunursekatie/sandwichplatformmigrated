-- Create kudos_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS kudos_tracking (
    id SERIAL PRIMARY KEY,
    from_user_id TEXT NOT NULL REFERENCES users(id),
    to_user_id TEXT REFERENCES users(id),
    target_type TEXT NOT NULL, -- 'task', 'project', 'user', etc.
    target_id TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kudos_from_user ON kudos_tracking(from_user_id);
CREATE INDEX IF NOT EXISTS idx_kudos_to_user ON kudos_tracking(to_user_id);
CREATE INDEX IF NOT EXISTS idx_kudos_target ON kudos_tracking(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_kudos_deleted_at ON kudos_tracking(deleted_at);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kudos_tracking_from_user_id_fkey'
    ) THEN
        ALTER TABLE kudos_tracking 
        ADD CONSTRAINT kudos_tracking_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kudos_tracking_to_user_id_fkey'
    ) THEN
        ALTER TABLE kudos_tracking 
        ADD CONSTRAINT kudos_tracking_to_user_id_fkey 
        FOREIGN KEY (to_user_id) REFERENCES users(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE kudos_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view kudos" ON kudos_tracking;
CREATE POLICY "Users can view kudos" ON kudos_tracking
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can create kudos" ON kudos_tracking;
CREATE POLICY "Users can create kudos" ON kudos_tracking
    FOR INSERT
    WITH CHECK (from_user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own kudos" ON kudos_tracking;
CREATE POLICY "Users can update their own kudos" ON kudos_tracking
    FOR UPDATE
    USING (from_user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete their own kudos" ON kudos_tracking;
CREATE POLICY "Users can delete their own kudos" ON kudos_tracking
    FOR DELETE
    USING (from_user_id = get_current_user_id() OR is_admin());