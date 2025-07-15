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

CREATE POLICY "Users can view non-deleted message recipients" ON message_recipients
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their message recipients" ON message_recipients
  FOR ALL
  USING (
    deleted_at IS NULL AND
    (recipient_id = auth.uid()::text OR 
     EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin')))
  ); 