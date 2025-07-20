import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

async function fixMessageReadsRLS() {
  try {
    console.log('🔧 Fixing message_reads RLS policies...');
    
    // First, let's check if the table has the composite primary key constraint for upsert
    const createConstraintSQL = `
      -- Add unique constraint for message_id, user_id if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'message_reads_pkey_composite'
        ) THEN
          ALTER TABLE message_reads 
          ADD CONSTRAINT message_reads_pkey_composite 
          UNIQUE (message_id, user_id);
        END IF;
      END $$;
    `;
    
    const { error: constraintError } = await supabase.rpc('exec_sql', { 
      sql: createConstraintSQL 
    });
    
    if (constraintError) {
      console.log('ℹ️ Could not add constraint (might already exist):', constraintError.message);
    } else {
      console.log('✅ Unique constraint ensured');
    }
    
    // Update RLS policies to be more permissive for authenticated users
    const rlsFixSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view their own message reads" ON message_reads;
      DROP POLICY IF EXISTS "Users can insert their own message reads" ON message_reads;
      DROP POLICY IF EXISTS "Users can update their own message reads" ON message_reads;
      
      -- Create more permissive policies that work with the current auth system
      -- Allow authenticated users to read their own message reads
      CREATE POLICY "message_reads_select_policy" ON message_reads
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
          user_id = auth.uid()::text OR
          user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      );
      
      -- Allow authenticated users to insert their own message reads
      CREATE POLICY "message_reads_insert_policy" ON message_reads
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
          user_id = auth.uid()::text OR
          user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      );
      
      -- Allow authenticated users to update their own message reads
      CREATE POLICY "message_reads_update_policy" ON message_reads
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
          user_id = auth.uid()::text OR
          user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      );
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: rlsFixSQL 
    });
    
    if (rlsError) {
      console.error('❌ Failed to update RLS policies:', rlsError);
      
      // Try a simpler approach - temporarily disable RLS for testing
      console.log('🔧 Trying alternative approach...');
      const simplifiedSQL = `
        -- Temporarily allow all authenticated users to access message_reads
        DROP POLICY IF EXISTS "message_reads_select_policy" ON message_reads;
        DROP POLICY IF EXISTS "message_reads_insert_policy" ON message_reads;
        DROP POLICY IF EXISTS "message_reads_update_policy" ON message_reads;
        
        CREATE POLICY "message_reads_allow_authenticated" ON message_reads
        FOR ALL USING (auth.uid() IS NOT NULL);
      `;
      
      const { error: simpleError } = await supabase.rpc('exec_sql', { 
        sql: simplifiedSQL 
      });
      
      if (simpleError) {
        console.error('❌ Failed to create simplified policy:', simpleError);
      } else {
        console.log('✅ Created simplified policy for authenticated users');
      }
    } else {
      console.log('✅ RLS policies updated successfully');
    }
    
    // Test the upsert operation again
    console.log('🧪 Testing upsert operation after RLS fix...');
    const testUserId = 'test_user_' + Date.now();
    const testMessageId = 999999;
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('message_reads')
      .upsert({
        message_id: testMessageId,
        user_id: testUserId,
        read_at: new Date().toISOString()
      }, { onConflict: 'message_id,user_id' });
    
    if (upsertError) {
      console.error('❌ Upsert still failing:', upsertError);
    } else {
      console.log('✅ Upsert operation now working!');
      
      // Clean up test record
      await supabase
        .from('message_reads')
        .delete()
        .eq('user_id', testUserId)
        .eq('message_id', testMessageId);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixMessageReadsRLS();