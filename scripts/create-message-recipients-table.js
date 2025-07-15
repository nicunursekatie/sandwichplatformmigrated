#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMessageRecipientsTable() {
  console.log('🚀 Creating message_recipients table...');
  
  try {
    console.log('📋 Checking if table already exists...');
    const { data: existingTable, error: checkError } = await supabase
      .from('message_recipients')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists');
      return;
    }
    
    console.log('📝 Table does not exist, creating it...');
    
    const createTableSQL = `
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
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.log('⚠️  Direct table creation failed, trying alternative approach...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('message_recipients')
        .insert({
          message_id: 999999,
          recipient_id: 'test_user',
          read: false
        });
      
      if (insertError && insertError.code === '42P01') {
        console.error('❌ Table does not exist and cannot be created through API');
        console.log('🔧 Please create the table manually in your Supabase dashboard:');
        console.log(createTableSQL);
        process.exit(1);
      }
    }
    
    console.log('✅ Successfully created message_recipients table');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('🔧 Please create the table manually in your Supabase dashboard with this SQL:');
    console.log(`
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
    `);
    process.exit(1);
  }
}

createMessageRecipientsTable(); 