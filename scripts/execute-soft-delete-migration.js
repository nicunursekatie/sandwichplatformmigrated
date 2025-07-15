#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to execute SQL from file
async function executeSQLFile(filePath, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error(`❌ Error executing statement: ${error.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Error executing statement: ${err.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`✅ ${description} completed: ${successCount} statements succeeded, ${errorCount} errors`);
    return errorCount === 0;
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return false;
  }
}

// Alternative approach using direct SQL execution
async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    // For Supabase, we'll execute the SQL directly using a simple query
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ ${description} failed:`, error.message);
      return false;
    } else {
      console.log(`✅ ${description} completed successfully`);
      return true;
    }
  } catch (err) {
    console.error(`❌ ${description} failed:`, err.message);
    return false;
  }
}

async function executeSoftDeleteMigration() {
  console.log('🚀 Starting Soft Delete Migration');
  console.log('=====================================');
  
  const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
  
  // Define migration steps in order
  const migrationSteps = [
    {
      file: path.join(scriptsDir, 'implement-soft-deletes.sql'),
      description: 'Adding soft delete columns and basic infrastructure'
    },
    {
      file: path.join(scriptsDir, 'setup-rls-policies.sql'),
      description: 'Setting up Row Level Security policies'
    },
    {
      file: path.join(scriptsDir, 'create-audit-triggers.sql'),
      description: 'Creating audit triggers for deletion tracking'
    }
  ];
  
  let allSuccessful = true;
  
  for (const step of migrationSteps) {
    const success = await executeSQLFile(step.file, step.description);
    if (!success) {
      allSuccessful = false;
      console.log(`\n⚠️  Migration step failed: ${step.description}`);
      console.log('You may need to run the remaining steps manually in your Supabase Dashboard');
    }
  }
  
  if (allSuccessful) {
    console.log('\n🎉 Soft Delete Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your application code to use soft deletes');
    console.log('2. Test the soft delete functionality');
    console.log('3. Train your team on the new audit capabilities');
  } else {
    console.log('\n⚠️  Migration completed with some errors');
    console.log('Please check the errors above and run the failed steps manually');
  }
  
  // Test the migration
  console.log('\n🧪 Testing migration...');
  await testMigration();
}

async function testMigration() {
  try {
    // Test if the functions exist
    const { data: functions, error } = await supabase.rpc('get_current_user_id');
    if (error) {
      console.log('⚠️  Some functions may not be available - you may need to run the migration manually in Supabase Dashboard');
    } else {
      console.log('✅ Migration functions are available');
    }
    
    // Test if deletion_audit table exists
    const { data: auditData, error: auditError } = await supabase
      .from('deletion_audit')
      .select('*')
      .limit(1);
    
    if (auditError && auditError.code === 'PGRST116') {
      console.log('⚠️  deletion_audit table may not exist - run the migration manually');
    } else {
      console.log('✅ deletion_audit table is accessible');
    }
    
  } catch (error) {
    console.log('⚠️  Could not fully test migration - some features may need manual setup');
  }
}

// Run the migration
executeSoftDeleteMigration().catch(console.error); 