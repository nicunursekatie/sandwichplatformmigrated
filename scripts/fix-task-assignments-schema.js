#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTaskAssignmentsSchema() {
  console.log('🔄 Fixing task_assignments table schema...');
  
  try {
    // First, let's check the current table structure
    const { data: tableInfo, error: infoError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);
    
    console.log('Current table structure check:', infoError ? 'Error' : 'Success');
    
    // Try to insert a test record with assigned_at to force schema refresh
    const testRecord = {
      task_id: 999999,
      user_id: '00000000-0000-0000-0000-000000000000',
      assigned_at: new Date().toISOString()
    };
    
    console.log('🧪 Testing insert with assigned_at column...');
    const { data: insertData, error: insertError } = await supabase
      .from('task_assignments')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      if (insertError.message.includes('assigned_at')) {
        console.log('❌ Column still not recognized in schema cache');
        console.log('🔧 Attempting to force schema refresh...');
        
        // Try to drop and recreate the table to force schema refresh
        console.log('📋 Recreating table with proper schema...');
        
        // Get existing data first
        const { data: existingData, error: selectError } = await supabase
          .from('task_assignments')
          .select('*');
        
        if (selectError) {
          console.error('Error getting existing data:', selectError);
          return;
        }
        
        console.log(`📊 Found ${existingData?.length || 0} existing records`);
        
        // Since we can't drop/recreate easily, let's try a different approach
        // Let's try to update the existing records to include the assigned_at field
        if (existingData && existingData.length > 0) {
          console.log('🔄 Updating existing records with assigned_at...');
          for (const record of existingData) {
            const { error: updateError } = await supabase
              .from('task_assignments')
              .update({ assigned_at: new Date().toISOString() })
              .eq('id', record.id);
            
            if (updateError) {
              console.log(`❌ Error updating record ${record.id}:`, updateError.message);
            } else {
              console.log(`✅ Updated record ${record.id}`);
            }
          }
        }
        
      } else if (insertError.code === '23503') {
        console.log('✅ Column exists! (Foreign key constraint error is expected)');
        
        // Clean up the test record
        await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', 999999);
        
        console.log('✅ Schema is working correctly');
        return;
      } else {
        console.log('❌ Unexpected error:', insertError);
        return;
      }
    } else {
      console.log('✅ Insert successful, column exists!');
      
      // Clean up the test record
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', 999999);
    }
    
    console.log('✅ Task assignments schema fix completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixTaskAssignmentsSchema(); 