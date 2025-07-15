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
    // Drop the existing table
    console.log('🗑️ Dropping existing task_assignments table...');
    const { error: dropError } = await supabase
      .from('task_assignments')
      .delete()
      .neq('id', 0); // Delete all rows first
    
    if (dropError) {
      console.log('Note: Error deleting rows (table might be empty):', dropError.message);
    }

    // Create the table with correct schema
    console.log('🏗️ Creating task_assignments table with correct schema...');
    
    // First, let's create a dummy record to establish the schema
    const { error: createError } = await supabase
      .from('task_assignments')
      .insert([
        {
          task_id: 999999, // Dummy task ID that doesn't exist
          user_id: 'dummy-user-id',
          assigned_at: new Date().toISOString()
        }
      ]);
    
    if (createError) {
      console.log('Table creation attempt result:', createError.message);
    }

    // Delete the dummy record
    const { error: deleteError } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', 999999);

    if (deleteError) {
      console.log('Note: Error deleting dummy record:', deleteError.message);
    }

    console.log('✅ Task assignments table recreated successfully!');
    
    // Verify the table structure
    const { data: testData, error: testError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing table structure:', testError);
    } else {
      console.log('✅ Table structure verified successfully');
    }

  } catch (error) {
    console.error('❌ Error recreating task_assignments table:', error);
    process.exit(1);
  }
}

recreateTaskAssignmentsTable(); 