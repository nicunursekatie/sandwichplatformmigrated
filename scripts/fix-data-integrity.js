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

// Check if this is a dry run
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('dry-run');

async function fixDataIntegrity() {
  console.log('🚀 Starting Data Integrity Fix...');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Check for orphaned user_id references in task_assignments
    console.log('\n📋 Checking task_assignments for orphaned user_id references...');
    const orphanedTaskAssignments = await client.query(`
      SELECT ta.id, ta.task_id, ta.user_id, pt.title as task_title
      FROM task_assignments ta
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN project_tasks pt ON ta.task_id = pt.id
      WHERE u.id IS NULL
      ORDER BY ta.id;
    `);

    if (orphanedTaskAssignments.rows.length > 0) {
      console.log(`❌ Found ${orphanedTaskAssignments.rows.length} orphaned task_assignments:`);
      orphanedTaskAssignments.rows.forEach(row => {
        console.log(`   - ID ${row.id}: task "${row.task_title}" assigned to non-existent user "${row.user_id}"`);
      });

      if (!isDryRun) {
        console.log('🗑️  Removing orphaned task_assignments...');
        const deleteResult = await client.query(`
          DELETE FROM task_assignments 
          WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${deleteResult.rowCount} orphaned task_assignments`);
      }
    } else {
      console.log('✅ No orphaned task_assignments found');
    }

    // 2. Check for orphaned user_id references in task_completions
    console.log('\n📋 Checking task_completions for orphaned user_id references...');
    const orphanedTaskCompletions = await client.query(`
      SELECT tc.id, tc.task_id, tc.user_id, pt.title as task_title, tc.completed_at
      FROM task_completions tc
      LEFT JOIN users u ON tc.user_id = u.id
      LEFT JOIN project_tasks pt ON tc.task_id = pt.id
      WHERE u.id IS NULL
      ORDER BY tc.id;
    `);

    if (orphanedTaskCompletions.rows.length > 0) {
      console.log(`❌ Found ${orphanedTaskCompletions.rows.length} orphaned task_completions:`);
      orphanedTaskCompletions.rows.forEach(row => {
        console.log(`   - ID ${row.id}: task "${row.task_title}" completed by non-existent user "${row.user_id}" at ${row.completed_at}`);
      });

      if (!isDryRun) {
        console.log('🗑️  Removing orphaned task_completions...');
        const deleteResult = await client.query(`
          DELETE FROM task_completions 
          WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${deleteResult.rowCount} orphaned task_completions`);
      }
    } else {
      console.log('✅ No orphaned task_completions found');
    }

    // 3. Check for orphaned task_id references in task_assignments
    console.log('\n📋 Checking task_assignments for orphaned task_id references...');
    const orphanedTaskIds = await client.query(`
      SELECT ta.id, ta.task_id, ta.user_id, u.first_name, u.last_name
      FROM task_assignments ta
      LEFT JOIN project_tasks pt ON ta.task_id = pt.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE pt.id IS NULL
      ORDER BY ta.id;
    `);

    if (orphanedTaskIds.rows.length > 0) {
      console.log(`❌ Found ${orphanedTaskIds.rows.length} task_assignments with orphaned task_id references:`);
      orphanedTaskIds.rows.forEach(row => {
        console.log(`   - ID ${row.id}: user "${row.first_name} ${row.last_name}" assigned to non-existent task "${row.task_id}"`);
      });

      if (!isDryRun) {
        console.log('🗑️  Removing task_assignments with orphaned task_id references...');
        const deleteResult = await client.query(`
          DELETE FROM task_assignments 
          WHERE task_id NOT IN (SELECT id FROM project_tasks)
        `);
        console.log(`✅ Removed ${deleteResult.rowCount} task_assignments with orphaned task_id references`);
      }
    } else {
      console.log('✅ No orphaned task_id references in task_assignments found');
    }

    // 4. Check for orphaned task_id references in task_completions
    console.log('\n📋 Checking task_completions for orphaned task_id references...');
    const orphanedCompletionTaskIds = await client.query(`
      SELECT tc.id, tc.task_id, tc.user_id, u.first_name, u.last_name, tc.completed_at
      FROM task_completions tc
      LEFT JOIN project_tasks pt ON tc.task_id = pt.id
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE pt.id IS NULL
      ORDER BY tc.id;
    `);

    if (orphanedCompletionTaskIds.rows.length > 0) {
      console.log(`❌ Found ${orphanedCompletionTaskIds.rows.length} task_completions with orphaned task_id references:`);
      orphanedCompletionTaskIds.rows.forEach(row => {
        console.log(`   - ID ${row.id}: user "${row.first_name} ${row.last_name}" completed non-existent task "${row.task_id}" at ${row.completed_at}`);
      });

      if (!isDryRun) {
        console.log('🗑️  Removing task_completions with orphaned task_id references...');
        const deleteResult = await client.query(`
          DELETE FROM task_completions 
          WHERE task_id NOT IN (SELECT id FROM project_tasks)
        `);
        console.log(`✅ Removed ${deleteResult.rowCount} task_completions with orphaned task_id references`);
      }
    } else {
      console.log('✅ No orphaned task_id references in task_completions found');
    }

    // 5. Show summary of valid data
    console.log('\n📊 Summary of valid data:');
    const validTaskAssignments = await client.query('SELECT COUNT(*) as count FROM task_assignments');
    const validTaskCompletions = await client.query('SELECT COUNT(*) as count FROM task_completions');
    const totalUsers = await client.query('SELECT COUNT(*) as count FROM users');
    const totalTasks = await client.query('SELECT COUNT(*) as count FROM project_tasks');

    console.log(`   - Valid task_assignments: ${validTaskAssignments.rows[0].count}`);
    console.log(`   - Valid task_completions: ${validTaskCompletions.rows[0].count}`);
    console.log(`   - Total users: ${totalUsers.rows[0].count}`);
    console.log(`   - Total project_tasks: ${totalTasks.rows[0].count}`);

    if (isDryRun) {
      console.log('\n🔍 Dry run completed - no changes were made');
      console.log('💡 Run without --dry-run to apply fixes');
    } else {
      console.log('\n🎉 Data integrity fixes completed!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixDataIntegrity().catch(console.error); 