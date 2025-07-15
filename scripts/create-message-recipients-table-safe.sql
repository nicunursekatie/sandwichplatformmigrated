CREATE TABLE IF NOT EXISTS message_recipients (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  context_access_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_recipients_unique ON message_recipients(message_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_unread ON message_recipients(recipient_id, read);

ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_recipients' 
    AND policyname = 'Users can view non-deleted message recipients'
  ) THEN
    CREATE POLICY "Users can view non-deleted message recipients" ON message_recipients
    FOR SELECT USING (deleted_at IS NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_recipients' 
    AND policyname = 'Users can insert message recipients'
  ) THEN
    CREATE POLICY "Users can insert message recipients" ON message_recipients
    FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_recipients' 
    AND policyname = 'Users can update their own message recipients'
  ) THEN
    CREATE POLICY "Users can update their own message recipients" ON message_recipients
    FOR UPDATE USING (recipient_id = auth.uid()::text AND deleted_at IS NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_recipients' 
    AND policyname = 'Users can soft delete message recipients'
  ) THEN
    CREATE POLICY "Users can soft delete message recipients" ON message_recipients
    FOR UPDATE USING (recipient_id = auth.uid()::text AND deleted_at IS NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_recipients' 
    AND policyname = 'Admins can view all message recipients'
  ) THEN
    CREATE POLICY "Admins can view all message recipients" ON message_recipients
    FOR ALL USING (is_admin() OR is_super_admin());
  END IF;
END
$$; 