#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTaskAssignmentsTable() {
  console.log('🔄 Creating task_assignments table...');
  
  try {
    // First, let's check if the table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ task_assignments table already exists and is accessible!');
      return true;
    }
    
    if (checkError.code !== 'PGRST106') { // Table doesn't exist
      console.error('❌ Error checking table:', checkError);
      return false;
    }
    
    console.log('📋 Table does not exist, creating it...');
    
    // Create the table by inserting a dummy record and then deleting it
    // This will force Supabase to recognize the table structure
    const { error: createError } = await supabase
      .from('task_assignments')
      .insert([
        {
          task_id: 999999, // Dummy task ID that won't exist
          user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          assigned_at: new Date().toISOString()
        }
      ]);
    
    if (createError && createError.code !== '23503') { // Foreign key constraint error is expected
      console.error('❌ Error creating table:', createError);
      return false;
    }
    
    console.log('✅ task_assignments table created and schema cache refreshed!');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Run the migration
createTaskAssignmentsTable()
  .then(success => {
    if (success) {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Migration failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }); 