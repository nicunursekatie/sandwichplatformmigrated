#!/usr/bin/env node

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User mapping from analysis
const userMapping = {
  'user_1751071509329_mrkw2z95z': {
    newUserId: 'd9d09b3e-573a-491d-8bc2-08989b330f91',
    name: 'Katie Long',
    email: 'kenig.ka@gmail.com'
  },
  'user_1751493923615_nbcyq3am7': {
    newUserId: 'af56e0df-f924-445a-8948-fddc234efcaa',
    name: 'Christine Cooper Nowicki',
    email: 'christine@thesandwichproject.org'
  },
  'user_1751072243271_fc8jaxl6u': {
    newUserId: 'ce79634b-fb82-42d5-8338-5fe1c5a2012f',
    name: 'Marcy Louza',
    email: 'mdlouza@gmail.com'
  },
  'user_1751492211973_0pi1jdl3p': {
    newUserId: '557334ba-e271-44b2-9588-40d4e95d1eb1',
    name: 'Stephanie Luis',
    email: 'stephanie@thesandwichproject.org'
  },
  'user_1751920534988_2cgbrae86': {
    newUserId: 'c9ada50f-532c-4193-b210-98e2deb5c25d',
    name: 'Vicki Tropauer',
    email: 'vickib@aol.com'
  },
  'user_1751975120117_tltz2rc1a': {
    newUserId: '33b57ab3-d24b-4640-8d63-113ce4946952',
    name: 'Kimberly Ross',
    email: 'ross.kimberly.a@gmail.com'
  }
};

// Check if this is a dry run
const isDryRun = process.argv.includes('--dry-run');

async function reassignOrphanedTasks() {
  console.log('🔄 Starting Task Reassignment Process...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Load original task data
    const originalTasks = JSON.parse(readFileSync('attached_assets/project_tasks (1).json', 'utf8'));
    console.log(`📋 Loaded ${originalTasks.length} original tasks`);
    
    // Get current users to verify mappings
    const { data: currentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name');
    
    if (usersError) {
      console.error('❌ Error fetching current users:', usersError);
      return;
    }
    
    console.log(`👥 Current users in database: ${currentUsers.length}`);
    
    // Verify user mappings
    console.log('\n🔍 Verifying user mappings...');
    const verifiedMappings = {};
    
    for (const [oldUserId, mapping] of Object.entries(userMapping)) {
      const user = currentUsers.find(u => u.id === mapping.newUserId);
      if (user) {
        verifiedMappings[oldUserId] = {
          ...mapping,
          verified: true,
          actualName: `${user.first_name} ${user.last_name}`,
          actualEmail: user.email
        };
        console.log(`   ✅ ${oldUserId} → ${mapping.newUserId} (${user.first_name} ${user.last_name})`);
      } else {
        console.log(`   ❌ ${oldUserId} → ${mapping.newUserId} (USER NOT FOUND)`);
      }
    }
    
    // Process tasks needing reassignment
    const tasksToReassign = originalTasks.filter(task => {
      const hasOldAssigneeIds = task.assignee_ids?.some(id => id && id.startsWith('user_'));
      const hasOldCompletedBy = task.completed_by && task.completed_by.startsWith('user_');
      return hasOldAssigneeIds || hasOldCompletedBy;
    });
    
    console.log(`\n📋 Processing ${tasksToReassign.length} tasks needing reassignment...`);
    
    let updatedTasks = 0;
    let createdAssignments = 0;
    let createdCompletions = 0;
    
    for (const task of tasksToReassign) {
      console.log(`\n🔧 Processing Task ${task.id}: "${task.title}"`);
      
      // Handle assignee_ids reassignment
      if (task.assignee_ids && Array.isArray(task.assignee_ids)) {
        const newAssigneeIds = [];
        const newAssigneeNames = [];
        
        for (let i = 0; i < task.assignee_ids.length; i++) {
          const oldUserId = task.assignee_ids[i];
          const oldName = task.assignee_names?.[i];
          
          if (oldUserId && oldUserId.startsWith('user_') && verifiedMappings[oldUserId]) {
            const mapping = verifiedMappings[oldUserId];
            newAssigneeIds.push(mapping.newUserId);
            newAssigneeNames.push(mapping.actualName);
            
            console.log(`   👤 Reassigning: ${oldName} (${oldUserId}) → ${mapping.actualName} (${mapping.newUserId})`);
            
            // Create task_assignments record
            if (!isDryRun) {
              const { error: assignmentError } = await supabase
                .from('task_assignments')
                .insert({
                  task_id: task.id,
                  user_id: mapping.newUserId,
                  assigned_at: task.created_at
                });
              
              if (assignmentError) {
                console.error(`     ❌ Error creating assignment:`, assignmentError);
              } else {
                createdAssignments++;
                console.log(`     ✅ Created task_assignments record`);
              }
            }
          } else if (oldUserId && !oldUserId.startsWith('user_')) {
            // Keep existing valid user IDs
            newAssigneeIds.push(oldUserId);
            newAssigneeNames.push(oldName);
          }
        }
        
        // Update project_tasks with new assignee_ids
        if (newAssigneeIds.length > 0) {
          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from('project_tasks')
              .update({
                assignee_ids: newAssigneeIds,
                assignee_names: newAssigneeNames
              })
              .eq('id', task.id);
            
            if (updateError) {
              console.error(`     ❌ Error updating task assignees:`, updateError);
            } else {
              console.log(`     ✅ Updated task assignee_ids`);
            }
          }
        }
      }
      
      // Handle completed_by reassignment
      if (task.completed_by && task.completed_by.startsWith('user_') && verifiedMappings[task.completed_by]) {
        const mapping = verifiedMappings[task.completed_by];
        
        console.log(`   ✅ Reassigning completion: ${task.completed_by_name} (${task.completed_by}) → ${mapping.actualName} (${mapping.newUserId})`);
        
        if (!isDryRun) {
          // Create task_completions record
          const { error: completionError } = await supabase
            .from('task_completions')
            .insert({
              task_id: task.id,
              user_id: mapping.newUserId,
              user_name: mapping.actualName,
              completed_at: task.completed_at || task.updated_at,
              notes: `Migrated from old system - originally completed by ${task.completed_by_name}`
            });
          
          if (completionError) {
            console.error(`     ❌ Error creating completion:`, completionError);
          } else {
            createdCompletions++;
            console.log(`     ✅ Created task_completions record`);
          }
          
          // Update project_tasks with new completed_by
          const { error: updateError } = await supabase
            .from('project_tasks')
            .update({
              completed_by: mapping.newUserId,
              completed_by_name: mapping.actualName
            })
            .eq('id', task.id);
          
          if (updateError) {
            console.error(`     ❌ Error updating task completed_by:`, updateError);
          } else {
            console.log(`     ✅ Updated task completed_by`);
          }
        }
      }
      
      updatedTasks++;
    }
    
    console.log(`\n🎉 Reassignment Summary:`);
    console.log(`   - Tasks processed: ${updatedTasks}`);
    console.log(`   - Task assignments created: ${createdAssignments}`);
    console.log(`   - Task completions created: ${createdCompletions}`);
    console.log(`   - Mode: ${isDryRun ? 'DRY RUN (no changes made)' : 'LIVE UPDATE (changes applied)'}`);
    
    if (isDryRun) {
      console.log(`\n💡 To apply these changes, run: npm run reassign:tasks`);
    } else {
      console.log(`\n✅ Task reassignment completed successfully!`);
    }
    
  } catch (error) {
    console.error('❌ Error during task reassignment:', error);
  } finally {
    await client.end();
  }
}

// Run the reassignment
reassignOrphanedTasks(); 