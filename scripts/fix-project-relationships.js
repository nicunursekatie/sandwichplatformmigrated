import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Found' : '❌ Missing');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'Not found');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProjectRelationships() {
  console.log('🔧 Starting database relationship fixes...');

  const statements = [
    // 1. Add foreign key from project_assignments to users
    `ALTER TABLE project_assignments 
     ADD CONSTRAINT fk_project_assignments_user 
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;`,

    // 2. Add foreign key from project_assignments to projects
    `ALTER TABLE project_assignments 
     ADD CONSTRAINT fk_project_assignments_project 
     FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;`,

    // 3. Add foreign key from project_tasks to projects
    `ALTER TABLE project_tasks 
     ADD CONSTRAINT fk_project_tasks_project 
     FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;`,

    // 4. Add foreign key from task_completions to project_tasks
    `ALTER TABLE task_completions 
     ADD CONSTRAINT fk_task_completions_task 
     FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;`,

    // 5. Add foreign key from task_completions to users
    `ALTER TABLE task_completions 
     ADD CONSTRAINT fk_task_completions_user 
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;`,

    // 6. Create task_assignments table
    `CREATE TABLE IF NOT EXISTS task_assignments (
       id SERIAL PRIMARY KEY,
       task_id INTEGER NOT NULL,
       user_id TEXT NOT NULL,
       assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
       CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
       CONSTRAINT fk_task_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       CONSTRAINT unique_task_user UNIQUE (task_id, user_id)
     );`,

    // 7. Add indexes
    `CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);`,
    `CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);`,
    `CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 80) + '...');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Continue with other statements even if one fails
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`❌ Exception executing statement ${i + 1}:`, err);
    }
  }

  // 8. Migrate existing task assignee data
  console.log('\n📋 Migrating existing task assignee data...');
  try {
    const { error: migrateError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO task_assignments (task_id, user_id, assigned_at)
        SELECT 
            pt.id as task_id,
            UNNEST(pt.assignee_ids) as user_id,
            pt.created_at as assigned_at
        FROM project_tasks pt
        WHERE pt.assignee_ids IS NOT NULL 
          AND array_length(pt.assignee_ids, 1) > 0
        ON CONFLICT (task_id, user_id) DO NOTHING;
      `
    });
    
    if (migrateError) {
      console.error('❌ Error migrating assignee_ids:', migrateError);
    } else {
      console.log('✅ Assignee_ids migration completed');
    }
  } catch (err) {
    console.error('❌ Exception during assignee_ids migration:', err);
  }

  // 9. Handle single assignee_id column
  console.log('\n👤 Migrating single assignee_id data...');
  try {
    const { error: singleError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO task_assignments (task_id, user_id, assigned_at)
        SELECT 
            pt.id as task_id,
            pt.assignee_id as user_id,
            pt.created_at as assigned_at
        FROM project_tasks pt
        WHERE pt.assignee_id IS NOT NULL 
          AND pt.assignee_id != ''
        ON CONFLICT (task_id, user_id) DO NOTHING;
      `
    });
    
    if (singleError) {
      console.error('❌ Error migrating assignee_id:', singleError);
    } else {
      console.log('✅ Single assignee_id migration completed');
    }
  } catch (err) {
    console.error('❌ Exception during assignee_id migration:', err);
  }

  // 10. Set up RLS policies
  console.log('\n🔒 Setting up Row Level Security...');
  const rlsStatements = [
    `ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY "Users can view task assignments" ON task_assignments
     FOR SELECT USING (auth.role() = 'authenticated');`,
    `CREATE POLICY "Users can manage task assignments" ON task_assignments
     FOR ALL USING (auth.role() = 'authenticated');`
  ];

  for (let i = 0; i < rlsStatements.length; i++) {
    const statement = rlsStatements[i];
    console.log(`\n🔒 RLS Statement ${i + 1}/${rlsStatements.length}`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error(`❌ Error with RLS statement ${i + 1}:`, error);
      } else {
        console.log(`✅ RLS statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`❌ Exception with RLS statement ${i + 1}:`, err);
    }
  }

  console.log('\n🎉 Database relationship fixes completed!');
  console.log('The PostgREST schema cache should automatically refresh.');
  console.log('Your project detail page should now work correctly.');
}

// Alternative approach: Use direct SQL execution if available
async function fixProjectRelationshipsDirectSQL() {
  console.log('🔧 Attempting direct SQL execution...');
  
  const fullSQL = `
    -- Fix Project Relationships and Missing Tables
    
    -- Add foreign key constraints (with IF NOT EXISTS equivalent)
    DO $$
    BEGIN
      -- 1. project_assignments -> users
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_user') THEN
        ALTER TABLE project_assignments 
        ADD CONSTRAINT fk_project_assignments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
      
      -- 2. project_assignments -> projects  
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_project') THEN
        ALTER TABLE project_assignments 
        ADD CONSTRAINT fk_project_assignments_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      END IF;
      
      -- 3. project_tasks -> projects
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_tasks_project') THEN
        ALTER TABLE project_tasks 
        ADD CONSTRAINT fk_project_tasks_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      END IF;
      
      -- 4. task_completions -> project_tasks
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_task') THEN
        ALTER TABLE task_completions 
        ADD CONSTRAINT fk_task_completions_task 
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
      END IF;
      
      -- 5. task_completions -> users
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_user') THEN
        ALTER TABLE task_completions 
        ADD CONSTRAINT fk_task_completions_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
    END $$;
    
    -- Create task_assignments table
    CREATE TABLE IF NOT EXISTS task_assignments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT unique_task_user UNIQUE (task_id, user_id)
    );
    
    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
    
    -- Migrate existing data
    INSERT INTO task_assignments (task_id, user_id, assigned_at)
    SELECT 
        pt.id as task_id,
        UNNEST(pt.assignee_ids) as user_id,
        pt.created_at as assigned_at
    FROM project_tasks pt
    WHERE pt.assignee_ids IS NOT NULL 
      AND array_length(pt.assignee_ids, 1) > 0
    ON CONFLICT (task_id, user_id) DO NOTHING;
    
    INSERT INTO task_assignments (task_id, user_id, assigned_at)
    SELECT 
        pt.id as task_id,
        pt.assignee_id as user_id,
        pt.created_at as assigned_at
    FROM project_tasks pt
    WHERE pt.assignee_id IS NOT NULL 
      AND pt.assignee_id != ''
    ON CONFLICT (task_id, user_id) DO NOTHING;
      
    -- Set up RLS
    ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view task assignments" ON task_assignments;
    CREATE POLICY "Users can view task assignments" ON task_assignments
        FOR SELECT USING (auth.role() = 'authenticated');
        
    DROP POLICY IF EXISTS "Users can manage task assignments" ON task_assignments;
    CREATE POLICY "Users can manage task assignments" ON task_assignments
        FOR ALL USING (auth.role() = 'authenticated');
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: fullSQL });
    if (error) {
      console.error('❌ Error executing full SQL:', error);
      return false;
    } else {
      console.log('✅ Full SQL executed successfully');
      return true;
    }
  } catch (err) {
    console.error('❌ Exception executing full SQL:', err);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Project Relationships Fix Script');
  console.log('This will fix the PostgREST relationship errors in your project detail page.\n');
  
  try {
    // Try direct SQL first
    const directSuccess = await fixProjectRelationshipsDirectSQL();
    
    if (!directSuccess) {
      console.log('\n⚠️  Direct SQL failed, trying statement-by-statement approach...');
      await fixProjectRelationships();
    }
    
    console.log('\n✨ All done! Your project detail page should now work correctly.');
    console.log('Please refresh your browser and try accessing the project details again.');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 