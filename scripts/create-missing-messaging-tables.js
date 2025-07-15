#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingMessagingTables() {
  console.log('🚀 Creating missing messaging tables...');
  
  const tables = [
    { name: 'message_threads', description: 'Message threading hierarchy' },
    { name: 'kudos_tracking', description: 'Kudos tracking to prevent spam' }
  ];
  
  for (const table of tables) {
    try {
      console.log(`📋 Checking if ${table.name} exists...`);
      
      const { data: existingTable, error: checkError } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);
      
      if (!checkError) {
        console.log(`✅ ${table.name} already exists`);
        continue;
      }
      
      if (checkError.code === '42P01') {
        console.log(`📝 ${table.name} does not exist, will be created manually`);
      } else {
        console.log(`⚠️  Unexpected error checking ${table.name}:`, checkError);
      }
      
    } catch (error) {
      console.log(`⚠️  Error checking ${table.name}:`, error);
    }
  }
  
  console.log('\n🔧 Please create the missing tables manually in your Supabase dashboard with this SQL:');
  console.log(`
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
  `);
}

createMissingMessagingTables(); 