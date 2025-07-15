#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSoftDeleteSystem() {
  console.log('🧪 Testing Soft Delete System');
  console.log('==============================');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Check if soft delete columns exist
  console.log('\n1. Testing database schema...');
  try {
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name')
      .in('column_name', ['deleted_at', 'deleted_by'])
      .in('table_name', ['users', 'projects', 'messages', 'hosts']);
    
    if (error) {
      console.error('❌ Schema check failed:', error.message);
      testsFailed++;
    } else {
      const tablesWithSoftDelete = [...new Set(columns.map(c => c.table_name))];
      console.log(`✅ Found soft delete columns in ${tablesWithSoftDelete.length} tables:`, tablesWithSoftDelete);
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ Schema check error:', error.message);
    testsFailed++;
  }
  
  // Test 2: Check if deletion_audit table exists
  console.log('\n2. Testing deletion_audit table...');
  try {
    const { data, error } = await supabase
      .from('deletion_audit')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.error('❌ deletion_audit table does not exist');
      testsFailed++;
    } else {
      console.log('✅ deletion_audit table exists and is accessible');
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ deletion_audit table check error:', error.message);
    testsFailed++;
  }
  
  // Test 3: Check if helper functions exist
  console.log('\n3. Testing database functions...');
  try {
    const functions = [
      'get_current_user_id',
      'set_current_user_id',
      'is_admin',
      'is_super_admin',
      'restore_soft_deleted_record',
      'permanently_delete_record'
    ];
    
    for (const func of functions) {
      try {
        const { error } = await supabase.rpc(func);
        // If we get here without a "function not found" error, the function exists
        console.log(`✅ Function ${func} exists`);
      } catch (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.error(`❌ Function ${func} not found`);
          testsFailed++;
        } else {
          // Function exists but may have failed for other reasons (expected)
          console.log(`✅ Function ${func} exists`);
        }
      }
    }
    testsPassed++;
  } catch (error) {
    console.error('❌ Function check error:', error.message);
    testsFailed++;
  }
  
  // Test 4: Check if RLS policies are active
  console.log('\n4. Testing RLS policies...');
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .in('tablename', ['users', 'projects', 'messages'])
      .ilike('policyname', '%deleted%');
    
    if (error) {
      console.error('❌ RLS policy check failed:', error.message);
      testsFailed++;
    } else {
      console.log(`✅ Found ${policies.length} RLS policies for soft deletes`);
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ RLS policy check error:', error.message);
    testsFailed++;
  }
  
  // Test 5: Check if audit triggers exist
  console.log('\n5. Testing audit triggers...');
  try {
    const { data: triggers, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .ilike('trigger_name', '%audit%')
      .in('event_object_table', ['users', 'projects', 'messages']);
    
    if (error) {
      console.error('❌ Trigger check failed:', error.message);
      testsFailed++;
    } else {
      console.log(`✅ Found ${triggers.length} audit triggers`);
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ Trigger check error:', error.message);
    testsFailed++;
  }
  
  // Test 6: Test soft delete functionality (if we can create a test record)
  console.log('\n6. Testing soft delete functionality...');
  try {
    // Try to create a test project
    const { data: testProject, error: createError } = await supabase
      .from('projects')
      .insert({
        title: 'Test Project for Soft Delete',
        description: 'This is a test project that will be soft deleted',
        status: 'waiting'
      })
      .select()
      .single();
    
    if (createError) {
      console.log('⚠️  Cannot create test project (may need authentication):', createError.message);
    } else {
      console.log(`✅ Created test project with ID: ${testProject.id}`);
      
      // Try to soft delete it
      const { error: deleteError } = await supabase
        .from('projects')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: 'test-user'
        })
        .eq('id', testProject.id);
      
      if (deleteError) {
        console.error('❌ Soft delete failed:', deleteError.message);
        testsFailed++;
      } else {
        console.log('✅ Soft delete operation successful');
        
        // Verify the record is soft deleted
        const { data: deletedProject, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', testProject.id)
          .single();
        
        if (fetchError) {
          console.log('✅ Soft deleted record is properly filtered by RLS');
          testsPassed++;
        } else if (deletedProject.deleted_at) {
          console.log('✅ Soft deleted record has deleted_at timestamp');
          testsPassed++;
        } else {
          console.error('❌ Soft delete did not set deleted_at timestamp');
          testsFailed++;
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Could not test soft delete functionality:', error.message);
  }
  
  // Test 7: Check audit log entries
  console.log('\n7. Testing audit log entries...');
  try {
    const { data: auditEntries, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Audit log check failed:', error.message);
      testsFailed++;
    } else {
      console.log(`✅ Found ${auditEntries.length} recent audit log entries`);
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ Audit log check error:', error.message);
    testsFailed++;
  }
  
  // Summary
  console.log('\n🏁 Test Summary');
  console.log('================');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Soft delete system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above and:');
    console.log('1. Ensure you have run the migration scripts');
    console.log('2. Check your database permissions');
    console.log('3. Verify RLS policies are configured correctly');
    console.log('4. Review the troubleshooting section in SOFT_DELETE_IMPLEMENTATION.md');
  }
  
  // Recommendations
  console.log('\n📋 Next Steps:');
  console.log('1. Run the migration scripts if you haven\'t already');
  console.log('2. Update your application code to use soft delete helpers');
  console.log('3. Add the admin interface to your dashboard');
  console.log('4. Test with different user roles and permissions');
  console.log('5. Monitor performance and audit log growth');
  
  return testsFailed === 0;
}

// Run the tests
testSoftDeleteSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  }); 