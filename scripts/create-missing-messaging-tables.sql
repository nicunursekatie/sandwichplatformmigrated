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

CREATE TABLE IF NOT EXISTS kudos_tracking (
  id SERIAL PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  context_type TEXT NOT NULL,
  context_id TEXT NOT NULL,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kudos_unique ON kudos_tracking(sender_id, recipient_id, context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_kudos_sender ON kudos_tracking(sender_id);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-deleted message threads" ON message_threads
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their message threads" ON message_threads
  FOR ALL
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can view non-deleted kudos tracking" ON kudos_tracking
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can manage their kudos tracking" ON kudos_tracking
  FOR ALL
  USING (
    deleted_at IS NULL AND
    (sender_id = auth.uid()::text OR recipient_id = auth.uid()::text OR 
     EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin')))
  ); 