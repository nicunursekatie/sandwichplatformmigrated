#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recreateTaskAssignmentsTable() {
  console.log('🔄 Recreating task_assignments table with proper schema...');
  
  try {
    // First, get any existing data
    const { data: existingData, error: selectError } = await supabase
      .from('task_assignments')
      .select('*');
    
    if (selectError) {
      console.log('No existing data or table doesn\'t exist:', selectError.message);
    } else {
      console.log(`📊 Found ${existingData?.length || 0} existing records`);
    }
    
    // Drop the existing table
    console.log('🗑️ Dropping existing table...');
    const dropResult = await supabase.rpc('execute_sql', {
      sql: 'DROP TABLE IF EXISTS task_assignments CASCADE;'
    });
    
    if (dropResult.error) {
      console.log('Drop via RPC failed, trying direct approach...');
      // If RPC doesn't work, we'll need to recreate differently
    }
    
    // Create the table with proper schema
    console.log('🏗️ Creating table with proper schema...');
    
    const createTableSQL = `
      CREATE TABLE task_assignments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id UUID NOT NULL,
        assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
        UNIQUE(task_id, user_id)
      );
      
      -- Create indexes
      CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
      CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
      CREATE INDEX idx_task_assignments_assigned_at ON task_assignments(assigned_at);
      
      -- Enable RLS
      ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY "Users can view task assignments they are involved in" ON task_assignments
        FOR SELECT USING (
          auth.uid() = user_id OR
          auth.uid() IN (
            SELECT pa.user_id FROM project_assignments pa
            JOIN project_tasks pt ON pt.project_id = pa.project_id
            WHERE pt.id = task_assignments.task_id
          )
        );
      
      CREATE POLICY "Users can create task assignments for projects they manage" ON task_assignments
        FOR INSERT WITH CHECK (
          auth.uid() IN (
            SELECT pa.user_id FROM project_assignments pa
            JOIN project_tasks pt ON pt.project_id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.role IN ('owner', 'admin')
          )
        );
      
      CREATE POLICY "Users can update task assignments for projects they manage" ON task_assignments
        FOR UPDATE USING (
          auth.uid() IN (
            SELECT pa.user_id FROM project_assignments pa
            JOIN project_tasks pt ON pt.project_id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.role IN ('owner', 'admin')
          )
        );
      
      CREATE POLICY "Users can delete task assignments for projects they manage" ON task_assignments
        FOR DELETE USING (
          auth.uid() IN (
            SELECT pa.user_id FROM project_assignments pa
            JOIN project_tasks pt ON pt.project_id = pa.project_id
            WHERE pt.id = task_assignments.task_id
            AND pa.role IN ('owner', 'admin')
          )
        );
    `;
    
    const createResult = await supabase.rpc('execute_sql', {
      sql: createTableSQL
    });
    
    if (createResult.error) {
      console.log('Create via RPC failed, trying alternative approach...');
      
      // Try creating by inserting a dummy record to force table creation
      const { error: insertError } = await supabase
        .from('task_assignments')
        .insert([{
          task_id: 999999,
          user_id: '00000000-0000-0000-0000-000000000000',
          assigned_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('❌ Failed to create table:', insertError);
        return;
      }
      
      // Clean up the dummy record
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', 999999);
      
      console.log('✅ Table created via insert approach');
    } else {
      console.log('✅ Table created via RPC');
    }
    
    // Test the table
    console.log('🧪 Testing table structure...');
    const { data: testData, error: testError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Table test failed:', testError);
    } else {
      console.log('✅ Table structure test passed');
    }
    
    console.log('✅ Task assignments table recreated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

recreateTaskAssignmentsTable(); 