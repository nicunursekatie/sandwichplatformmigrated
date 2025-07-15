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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_threads' 
    AND policyname = 'Users can view non-deleted message threads'
  ) THEN
    CREATE POLICY "Users can view non-deleted message threads" ON message_threads
    FOR SELECT USING (deleted_at IS NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_threads' 
    AND policyname = 'Users can insert message threads'
  ) THEN
    CREATE POLICY "Users can insert message threads" ON message_threads
    FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_threads' 
    AND policyname = 'Users can update message threads'
  ) THEN
    CREATE POLICY "Users can update message threads" ON message_threads
    FOR UPDATE USING (deleted_at IS NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_threads' 
    AND policyname = 'Admins can view all message threads'
  ) THEN
    CREATE POLICY "Admins can view all message threads" ON message_threads
    FOR ALL USING (is_admin() OR is_super_admin());
  END IF;
END
$$; 