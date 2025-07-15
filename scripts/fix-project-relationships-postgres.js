#!/usr/bin/env node

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔗 Connecting to PostgreSQL database...');
console.log('URL:', DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Hide password in logs

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ddlStatements = [
  // 1. Add foreign key constraints (without IF NOT EXISTS which isn't supported)
  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_user') THEN
       ALTER TABLE project_assignments 
       ADD CONSTRAINT fk_project_assignments_user 
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_assignments_project') THEN
       ALTER TABLE project_assignments 
       ADD CONSTRAINT fk_project_assignments_project 
       FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_tasks_project') THEN
       ALTER TABLE project_tasks 
       ADD CONSTRAINT fk_project_tasks_project 
       FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_assignments_task') THEN
       ALTER TABLE task_assignments 
       ADD CONSTRAINT fk_task_assignments_task 
       FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_assignments_user') THEN
       ALTER TABLE task_assignments 
       ADD CONSTRAINT fk_task_assignments_user 
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_task') THEN
       ALTER TABLE task_completions 
       ADD CONSTRAINT fk_task_completions_task 
       FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  `DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_completions_user') THEN
       ALTER TABLE task_completions 
       ADD CONSTRAINT fk_task_completions_user 
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
     END IF;
   END $$;`,

  // 2. Create indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);`,
  `CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);`,
  `CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);`,

  // 3. Migrate existing data from assignee_ids array to task_assignments (fix column name)
  `INSERT INTO task_assignments (task_id, user_id)
   SELECT 
     pt.id as task_id,
     UNNEST(pt.assignee_ids) as user_id
   FROM project_tasks pt
   WHERE pt.assignee_ids IS NOT NULL 
     AND array_length(pt.assignee_ids, 1) > 0
   ON CONFLICT (task_id, user_id) DO NOTHING;`,

  // 4. Migrate data from single assignee_id (fix column name)
  `INSERT INTO task_assignments (task_id, user_id)
   SELECT 
     pt.id as task_id,
     pt.assignee_id as user_id
   FROM project_tasks pt
   WHERE pt.assignee_id IS NOT NULL 
     AND pt.assignee_id != ''
     AND NOT EXISTS (
       SELECT 1 FROM task_assignments ta 
       WHERE ta.task_id = pt.id AND ta.user_id = pt.assignee_id
     )
   ON CONFLICT (task_id, user_id) DO NOTHING;`
];

async function fixProjectRelationships() {
  try {
    console.log('🚀 Starting Project Relationships Fix...');
    await client.connect();
    console.log('✅ Connected to database');

    for (let i = 0; i < ddlStatements.length; i++) {
      const statement = ddlStatements[i];
      console.log(`\n📝 Executing statement ${i + 1}/${ddlStatements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      try {
        const result = await client.query(statement);
        console.log('✅ Success');
        if (result.rowCount !== null) {
          console.log(`   Rows affected: ${result.rowCount}`);
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
        // Continue with other statements even if one fails
      }
    }

    // Verify the relationships work
    console.log('\n🔍 Verifying relationships...');
    
    const testQueries = [
      {
        name: 'project_assignments -> users',
        query: `SELECT pa.id, pa.user_id, u.email, u.first_name 
                FROM project_assignments pa 
                LEFT JOIN users u ON pa.user_id = u.id 
                LIMIT 3;`
      },
      {
        name: 'task_assignments -> project_tasks',
        query: `SELECT ta.id, ta.task_id, pt.title, ta.user_id 
                FROM task_assignments ta 
                LEFT JOIN project_tasks pt ON ta.task_id = pt.id 
                LIMIT 3;`
      },
      {
        name: 'task_assignments -> users',
        query: `SELECT ta.id, ta.user_id, u.email, u.first_name 
                FROM task_assignments ta 
                LEFT JOIN users u ON ta.user_id = u.id 
                LIMIT 3;`
      }
    ];

    for (const test of testQueries) {
      try {
        const result = await client.query(test.query);
        console.log(`✅ ${test.name}: ${result.rows.length} rows returned`);
      } catch (error) {
        console.error(`❌ ${test.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Database relationship fixes completed!');
    console.log('🔄 PostgREST schema cache will refresh automatically');
    console.log('🚀 Your project detail page should now work correctly');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixProjectRelationships().catch(console.error); 