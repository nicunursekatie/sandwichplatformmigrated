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
FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can insert message recipients" ON message_recipients
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own message recipients" ON message_recipients
FOR UPDATE USING (recipient_id = auth.uid()::text AND deleted_at IS NULL);

CREATE TABLE IF NOT EXISTS message_threads (
  id SERIAL PRIMARY KEY,
  root_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_unique ON message_threads(message_id);
CREATE INDEX IF NOT EXISTS idx_thread_path ON message_threads(path);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-deleted message threads" ON message_threads
FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can insert message threads" ON message_threads
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update message threads" ON message_threads
FOR UPDATE USING (deleted_at IS NULL);

CREATE TABLE IF NOT EXISTS kudos_tracking (
  id SERIAL PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  context_type TEXT NOT NULL,
  context_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_kudos_tracking_sender ON kudos_tracking(sender_id);
CREATE INDEX IF NOT EXISTS idx_kudos_tracking_recipient ON kudos_tracking(recipient_id);
CREATE INDEX IF NOT EXISTS idx_kudos_tracking_context ON kudos_tracking(context_type, context_id);

ALTER TABLE kudos_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-deleted kudos tracking" ON kudos_tracking
FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can insert kudos tracking" ON kudos_tracking
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own kudos tracking" ON kudos_tracking
FOR UPDATE USING (sender_id = auth.uid()::text AND deleted_at IS NULL); 