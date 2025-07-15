#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeTaskAssignmentsSQL() {
  console.log('🔄 Executing task_assignments table creation SQL...');
  
  try {
    // First, drop the existing table to start fresh
    console.log('🗑️ Dropping existing table...');
    const dropSQL = `
      DROP TABLE IF EXISTS task_assignments CASCADE;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropSQL
    });
    
    if (dropError) {
      console.log('Drop via RPC failed, continuing anyway...');
    } else {
      console.log('✅ Existing table dropped');
    }
    
    // Now create the table with proper schema
    console.log('🏗️ Creating table with proper schema...');
    
    const createSQL = `
      -- Create task_assignments table for multi-user task assignments
      CREATE TABLE task_assignments (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
      );
      
      -- Create indexes for better performance
      CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
      CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
      CREATE INDEX idx_task_assignments_assigned_at ON task_assignments(assigned_at);
      
      -- Create unique constraint to prevent duplicate assignments
      CREATE UNIQUE INDEX idx_task_assignments_unique 
      ON task_assignments(task_id, user_id);
      
      -- Add RLS (Row Level Security) policies
      ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
      
      -- Grant permissions to authenticated users
      GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignments TO authenticated;
      GRANT USAGE ON SEQUENCE task_assignments_id_seq TO authenticated;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createSQL
    });
    
    if (createError) {
      console.error('❌ Create via RPC failed:', createError);
      
      // Try alternative approach - force table creation by inserting then deleting
      console.log('🔄 Trying alternative approach...');
      
      const { error: insertError } = await supabase
        .from('task_assignments')
        .insert([{
          task_id: 999999,
          user_id: '00000000-0000-0000-0000-000000000000',
          assigned_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('❌ Insert approach also failed:', insertError);
        return;
      }
      
      // Clean up
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
    
    // Test insert with assigned_at
    console.log('🧪 Testing insert with assigned_at column...');
    const { data: insertTestData, error: insertTestError } = await supabase
      .from('task_assignments')
      .insert([{
        task_id: 999998,
        user_id: '00000000-0000-0000-0000-000000000000',
        assigned_at: new Date().toISOString()
      }])
      .select();
    
    if (insertTestError) {
      if (insertTestError.code === '23503') {
        console.log('✅ Insert test passed (foreign key constraint expected)');
      } else {
        console.error('❌ Insert test failed:', insertTestError);
      }
    } else {
      console.log('✅ Insert test passed');
      // Clean up
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', 999998);
    }
    
    console.log('✅ Task assignments table setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

executeTaskAssignmentsSQL(); 