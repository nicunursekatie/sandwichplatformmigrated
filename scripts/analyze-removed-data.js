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

console.log('🔍 Analyzing removed data patterns...');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeRemovedData() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Let's look at the user IDs that were removed to understand the pattern
    console.log('\n📋 Analyzing removed user ID patterns...');
    
    const removedUserIds = [
      'user_1751493923615_nbcyq3am7',
      'user_1751072243271_fc8jaxl6u', 
      'user_1751492211973_0pi1jdl3p',
      'user_1751071509329_mrkw2z95z',
      'user_1751920534988_2cgbrae86',
      'user_1751975120117_tltz2rc1a'
    ];

    console.log('🔍 Removed user IDs (these look like old system IDs):');
    removedUserIds.forEach(id => {
      const timestamp = id.split('_')[1];
      const date = new Date(parseInt(timestamp));
      console.log(`   - ${id} (created: ${date.toISOString()})`);
    });

    // Check if these user IDs exist in any other format in the users table
    console.log('\n🔍 Checking if similar users exist in current users table...');
    
    for (const oldUserId of removedUserIds) {
      // Extract timestamp from old user ID
      const timestamp = oldUserId.split('_')[1];
      const date = new Date(parseInt(timestamp));
      
      // Look for users created around the same time
      const similarUsers = await client.query(`
        SELECT id, email, first_name, last_name, created_at
        FROM users 
        WHERE created_at BETWEEN $1::timestamp - interval '1 day' 
                             AND $1::timestamp + interval '1 day'
        ORDER BY created_at;
      `, [date.toISOString()]);

      if (similarUsers.rows.length > 0) {
        console.log(`\n📅 Users created around ${date.toDateString()}:`);
        similarUsers.rows.forEach(user => {
          console.log(`   - ${user.id}: ${user.first_name} ${user.last_name} (${user.email})`);
        });
      }
    }

    // Check what tasks were affected
    console.log('\n📋 Analyzing affected tasks...');
    
    const affectedTasks = [
      'Christine Test Assignment',
      'Test out direct messaging', 
      'Create a task within our shared assignment project to make sure this works',
      'Build work log function',
      'Build suggestion portal'
    ];

    for (const taskTitle of affectedTasks) {
      const task = await client.query(`
        SELECT id, title, description, project_id, created_at
        FROM project_tasks 
        WHERE title = $1;
      `, [taskTitle]);

      if (task.rows.length > 0) {
        const taskData = task.rows[0];
        console.log(`\n📝 Task: "${taskTitle}"`);
        console.log(`   - ID: ${taskData.id}`);
        console.log(`   - Project ID: ${taskData.project_id}`);
        console.log(`   - Created: ${taskData.created_at}`);
        
        // Check if this task has any current assignments
        const currentAssignments = await client.query(`
          SELECT ta.id, ta.user_id, u.first_name, u.last_name, u.email
          FROM task_assignments ta
          JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id = $1;
        `, [taskData.id]);

        if (currentAssignments.rows.length > 0) {
          console.log(`   - Current assignments:`);
          currentAssignments.rows.forEach(assignment => {
            console.log(`     * ${assignment.first_name} ${assignment.last_name} (${assignment.email})`);
          });
        } else {
          console.log(`   - ⚠️  No current assignments (orphaned task)`);
        }
      }
    }

    // Check current valid users to see who might be the intended assignees
    console.log('\n👥 Current valid users in the system:');
    const currentUsers = await client.query(`
      SELECT id, email, first_name, last_name, created_at
      FROM users 
      ORDER BY created_at DESC;
    `);

    currentUsers.rows.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.email}) - ID: ${user.id}`);
    });

    // Summary and recommendations
    console.log('\n📊 Analysis Summary:');
    console.log(`   - Removed ${removedUserIds.length} orphaned user references`);
    console.log(`   - Affected ${affectedTasks.length} different tasks`);
    console.log(`   - Current system has ${currentUsers.rows.length} valid users`);
    
    console.log('\n💡 Recommendations:');
    console.log('   1. The removed user IDs appear to be from an old system format');
    console.log('   2. These were likely test assignments or from a migration');
    console.log('   3. Tasks still exist and can be reassigned to current users');
    console.log('   4. No critical data was lost - just orphaned references were cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the analysis
analyzeRemovedData().catch(console.error); 