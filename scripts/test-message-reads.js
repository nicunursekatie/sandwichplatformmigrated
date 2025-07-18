import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

async function testMessageReads() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test basic connection
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Supabase connection failed:', usersError);
      return;
    }
    console.log('✅ Supabase connection successful');
    
    // Test message_reads table existence
    console.log('🔍 Testing message_reads table...');
    const { data: messageReadsTest, error: messageReadsError } = await supabase
      .from('message_reads')
      .select('*')
      .limit(1);
    
    if (messageReadsError) {
      console.error('❌ message_reads table error:', messageReadsError);
      if (messageReadsError.code === '42P01') {
        console.log('🚨 The message_reads table does not exist!');
      }
    } else {
      console.log('✅ message_reads table exists and is accessible');
    }
    
    // Test inserting a sample record to identify constraint issues
    console.log('🔍 Testing upsert operation...');
    const testUserId = 'test_user_' + Date.now();
    const testMessageId = 999999; // Use a high ID that likely doesn't exist
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('message_reads')
      .upsert({
        message_id: testMessageId,
        user_id: testUserId,
        read_at: new Date().toISOString()
      }, { onConflict: 'message_id,user_id' });
    
    if (upsertError) {
      console.error('❌ Upsert operation failed:', upsertError);
      if (upsertError.code === '23503') {
        console.log('🚨 Foreign key constraint violation - likely missing messages or users table references');
      } else if (upsertError.code === '23505') {
        console.log('🚨 Unique constraint violation');
      } else if (upsertError.code === '42703') {
        console.log('🚨 Column does not exist');
      } else if (upsertError.code === '42P01') {
        console.log('🚨 Table does not exist');
      }
    } else {
      console.log('✅ Upsert operation successful');
      
      // Clean up test record
      await supabase
        .from('message_reads')
        .delete()
        .eq('user_id', testUserId)
        .eq('message_id', testMessageId);
    }
    
    // Check table structure
    console.log('🔍 Checking table structure...');
    const { data: tableInfo, error: tableInfoError } = await supabase
      .rpc('get_table_info', { table_name: 'message_reads' })
      .single();
      
    if (tableInfoError) {
      console.log('ℹ️ Could not get table structure info:', tableInfoError.message);
    } else {
      console.log('📋 Table structure:', tableInfo);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

testMessageReads();