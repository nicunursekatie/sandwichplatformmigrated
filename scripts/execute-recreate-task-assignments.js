#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recreateTaskAssignmentsTable() {
  console.log('🔄 Recreating task_assignments table with correct schema...');
  
  try {
    // Step 1: Clear existing data
    console.log('🗑️ Clearing existing task_assignments data...');
    const { error: deleteError } = await supabase
      .from('task_assignments')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.log('Note: Error clearing data (table might be empty):', deleteError.message);
    }

    // Step 2: Get a valid task_id and user_id for testing
    console.log('🔍 Finding valid task and user IDs...');
    
    const { data: tasks } = await supabase
      .from('project_tasks')
      .select('id')
      .limit(1);
    
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (!tasks || tasks.length === 0) {
      console.error('❌ No tasks found in database');
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('❌ No users found in database');
      return;
    }

    const testTaskId = tasks[0].id;
    const testUserId = users[0].id;

    // Step 3: Insert a test record with the correct schema including assigned_at
    console.log('🏗️ Creating table schema with assigned_at column...');
    const { data: insertData, error: insertError } = await supabase
      .from('task_assignments')
      .insert([
        {
          task_id: testTaskId,
          user_id: testUserId,
          assigned_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (insertError) {
      console.error('❌ Error creating schema:', insertError);
      return;
    }

    // Step 4: Delete the test record
    console.log('🧹 Cleaning up test record...');
    const { error: cleanupError } = await supabase
      .from('task_assignments')
      .delete()
      .eq('id', insertData[0].id);
    
    if (cleanupError) {
      console.log('Note: Error cleaning up test record:', cleanupError.message);
    }

    console.log('✅ Task assignments table recreated successfully with assigned_at column!');
    
    // Step 5: Verify the schema
    const { data: testData, error: testError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing table structure:', testError);
    } else {
      console.log('✅ Table structure verified - ready for task assignments!');
    }

  } catch (error) {
    console.error('❌ Error recreating task_assignments table:', error);
    process.exit(1);
  }
}

recreateTaskAssignmentsTable(); 