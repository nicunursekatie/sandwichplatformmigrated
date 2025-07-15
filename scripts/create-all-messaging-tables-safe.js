#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  try {
    console.log(`📋 ${description}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ Error executing ${description}:`, error);
      return false;
    }
    
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error);
    return false;
  }
}

async function createAllMessagingTables() {
  console.log('🚀 Creating all missing messaging tables safely...');
  
  try {
    // Read SQL files
    const messageRecipientsSQL = readFileSync(join(__dirname, 'create-message-recipients-table-safe.sql'), 'utf8');
    const messageThreadsSQL = readFileSync(join(__dirname, 'create-message-threads-table-safe.sql'), 'utf8');
    
    // Execute SQL scripts
    const results = await Promise.all([
      executeSQL(messageRecipientsSQL, 'Creating message_recipients table'),
      executeSQL(messageThreadsSQL, 'Creating message_threads table')
    ]);
    
    const successCount = results.filter(Boolean).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Summary: ${successCount}/${totalCount} tables created successfully`);
    
    if (successCount === totalCount) {
      console.log('🎉 All messaging tables created successfully!');
    } else {
      console.log('⚠️  Some tables may have had issues. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Error reading SQL files:', error);
  }
}

createAllMessagingTables().catch(console.error); 