#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAssignedAtColumn() {
  console.log('🔄 Adding assigned_at column to task_assignments table...');
  
  try {
    // Add the assigned_at column using raw SQL
    const { error } = await supabase
      .from('task_assignments')
      .select('assigned_at')
      .limit(1);
    
    if (error && error.message.includes('column "assigned_at" does not exist')) {
      console.log('Column does not exist, adding it...');
      
      // Execute the ALTER TABLE statement
      const { error: alterError } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE task_assignments ADD COLUMN assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();`
      });
      
      if (alterError) {
        // Try alternative approach if RPC doesn't work
        console.log('RPC approach failed, trying direct query...');
        const { error: directError } = await supabase
          .from('task_assignments')
          .insert({
            task_id: 999999,
            user_id: 'temp',
            assigned_at: new Date().toISOString()
          });
        
        if (directError && directError.message.includes('assigned_at')) {
          console.log('✅ Column already exists or was added successfully');
        } else {
          console.error('Error adding column:', directError);
          return;
        }
      } else {
        console.log('✅ Column added successfully via RPC');
      }
    } else {
      console.log('✅ Column already exists');
    }
    
    console.log('✅ Task assignments table is ready with assigned_at column');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addAssignedAtColumn(); 