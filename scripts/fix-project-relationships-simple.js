import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the frontend
const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    } else {
      console.log('✅ Connection successful');
      return true;
    }
  } catch (err) {
    console.error('❌ Connection exception:', err);
    return false;
  }
}

async function createTaskAssignmentsTable() {
  console.log('📋 Creating task_assignments table...');
  
  try {
    // Try to create the table using a simple insert/select approach
    // This is a workaround since we can't execute DDL directly
    const { error } = await supabase
      .from('task_assignments')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST106') {
      console.log('❌ task_assignments table does not exist');
      console.log('⚠️  Cannot create tables with anon key - need database admin access');
      return false;
    } else if (error) {
      console.error('❌ Error checking task_assignments table:', error);
      return false;
    } else {
      console.log('✅ task_assignments table already exists');
      return true;
    }
  } catch (err) {
    console.error('❌ Exception checking task_assignments table:', err);
    return false;
  }
}

async function checkCurrentRelationships() {
  console.log('🔍 Checking current database relationships...');
  
  // Test the problematic queries from the frontend
  console.log('Testing project_tasks with task_assignments join...');
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        assigned_users:task_assignments(
          *,
          user:users(id, email, first_name, last_name)
        )
      `)
      .eq('project_id', 41)
      .limit(1);
    
    if (error) {
      console.error('❌ project_tasks -> task_assignments join failed:', error.message);
    } else {
      console.log('✅ project_tasks -> task_assignments join works');
    }
  } catch (err) {
    console.error('❌ Exception testing project_tasks join:', err);
  }
  
  console.log('Testing project_assignments with users join...');
  try {
    const { data, error } = await supabase
      .from('project_assignments')
      .select(`
        *,
        user:users(id, email, first_name, last_name)
      `)
      .eq('project_id', 41)
      .limit(1);
    
    if (error) {
      console.error('❌ project_assignments -> users join failed:', error.message);
    } else {
      console.log('✅ project_assignments -> users join works');
    }
  } catch (err) {
    console.error('❌ Exception testing project_assignments join:', err);
  }
}

async function suggestSolution() {
  console.log('\n💡 SOLUTION REQUIRED:');
  console.log('The database needs foreign key relationships to be added by a database administrator.');
  console.log('');
  console.log('📝 SQL Commands needed (run in Supabase SQL Editor):');
  console.log('');
  console.log('1. Add foreign key from project_assignments to users:');
  console.log('   ALTER TABLE project_assignments ADD CONSTRAINT fk_project_assignments_user FOREIGN KEY (user_id) REFERENCES users(id);');
  console.log('');
  console.log('2. Create task_assignments table:');
  console.log(`   CREATE TABLE task_assignments (
       id SERIAL PRIMARY KEY,
       task_id INTEGER NOT NULL,
       user_id TEXT NOT NULL,
       assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
       CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES project_tasks(id),
       CONSTRAINT fk_task_assignments_user FOREIGN KEY (user_id) REFERENCES users(id),
       CONSTRAINT unique_task_user UNIQUE (task_id, user_id)
   );`);
  console.log('');
  console.log('3. Add indexes for performance:');
  console.log('   CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);');
  console.log('   CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);');
  console.log('   CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);');
  console.log('');
  console.log('4. Migrate existing data:');
  console.log(`   INSERT INTO task_assignments (task_id, user_id, assigned_at)
   SELECT pt.id, UNNEST(pt.assignee_ids), pt.created_at
   FROM project_tasks pt
   WHERE pt.assignee_ids IS NOT NULL AND array_length(pt.assignee_ids, 1) > 0
   ON CONFLICT (task_id, user_id) DO NOTHING;`);
  console.log('');
  console.log('🚀 After running these commands, your project detail page should work correctly.');
}

async function main() {
  console.log('🚀 Project Relationships Diagnostic Script');
  console.log('This script will test the current database state and provide solutions.\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot connect to Supabase. Please check your configuration.');
    return;
  }
  
  await checkCurrentRelationships();
  await createTaskAssignmentsTable();
  await suggestSolution();
}

// Run the main function
main(); 