#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeTaskAssignments() {
  console.log('🔍 Analyzing original project task assignments...');
  
  try {
    // Load the original task data
    const originalTasks = JSON.parse(readFileSync('attached_assets/project_tasks (1).json', 'utf8'));
    console.log(`📋 Found ${originalTasks.length} original tasks`);
    
    // Get current users from database
    const { data: currentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name');
    
    if (usersError) {
      console.error('❌ Error fetching current users:', usersError);
      return;
    }
    
    console.log(`👥 Current users in database: ${currentUsers.length}`);
    
    // Analyze assignment patterns
    const assignmentAnalysis = {
      tasksWithOldUserIds: [],
      uniqueOldUserIds: new Set(),
      completedByOldUserIds: new Set(),
      assigneeMapping: new Map(),
      completedByMapping: new Map(),
      tasksNeedingReassignment: []
    };
    
    // Process each task
    originalTasks.forEach(task => {
      // Check assignee_ids (multiple assignments)
      if (task.assignee_ids && Array.isArray(task.assignee_ids)) {
        task.assignee_ids.forEach(userId => {
          if (userId && userId.startsWith('user_')) {
            assignmentAnalysis.uniqueOldUserIds.add(userId);
            assignmentAnalysis.tasksWithOldUserIds.push({
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.project_id,
              oldUserId: userId,
              type: 'assignee',
              assigneeNames: task.assignee_names
            });
          }
        });
      }
      
      // Check completed_by (single completion)
      if (task.completed_by && task.completed_by.startsWith('user_')) {
        assignmentAnalysis.completedByOldUserIds.add(task.completed_by);
        assignmentAnalysis.tasksWithOldUserIds.push({
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.project_id,
          oldUserId: task.completed_by,
          type: 'completed_by',
          completedByName: task.completed_by_name
        });
      }
    });
    
    console.log(`\n📊 Assignment Analysis:`);
    console.log(`   - Tasks with old user IDs: ${assignmentAnalysis.tasksWithOldUserIds.length}`);
    console.log(`   - Unique old user IDs: ${assignmentAnalysis.uniqueOldUserIds.size}`);
    console.log(`   - Old user IDs in completed_by: ${assignmentAnalysis.completedByOldUserIds.size}`);
    
    // Create user mapping based on names
    console.log(`\n🔗 Creating user mapping based on names:`);
    
    const userMapping = new Map();
    
    // Map old user IDs to current users by matching names
    assignmentAnalysis.tasksWithOldUserIds.forEach(task => {
      if (task.type === 'assignee' && task.assigneeNames) {
        task.assigneeNames.forEach((name, index) => {
          if (task.oldUserId === task.assignee_ids?.[index]) {
            const matchedUser = currentUsers.find(user => 
              `${user.first_name} ${user.last_name}`.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(`${user.first_name} ${user.last_name}`.toLowerCase())
            );
            if (matchedUser) {
              userMapping.set(task.oldUserId, {
                newUserId: matchedUser.id,
                name: `${matchedUser.first_name} ${matchedUser.last_name}`,
                email: matchedUser.email,
                oldName: name
              });
            }
          }
        });
      }
      
      if (task.type === 'completed_by' && task.completedByName) {
        const matchedUser = currentUsers.find(user => 
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(task.completedByName.toLowerCase()) ||
          task.completedByName.toLowerCase().includes(`${user.first_name} ${user.last_name}`.toLowerCase())
        );
        if (matchedUser) {
          userMapping.set(task.oldUserId, {
            newUserId: matchedUser.id,
            name: `${matchedUser.first_name} ${matchedUser.last_name}`,
            email: matchedUser.email,
            oldName: task.completedByName
          });
        }
      }
    });
    
    console.log(`\n👤 User Mapping Results:`);
    userMapping.forEach((mapping, oldUserId) => {
      console.log(`   ${oldUserId} → ${mapping.newUserId} (${mapping.name}) [was: ${mapping.oldName}]`);
    });
    
    // Identify tasks that need reassignment
    const tasksNeedingReassignment = originalTasks.filter(task => {
      const hasOldAssigneeIds = task.assignee_ids?.some(id => id && id.startsWith('user_'));
      const hasOldCompletedBy = task.completed_by && task.completed_by.startsWith('user_');
      return hasOldAssigneeIds || hasOldCompletedBy;
    });
    
    console.log(`\n🔄 Tasks needing reassignment: ${tasksNeedingReassignment.length}`);
    
    // Group by project for better organization
    const tasksByProject = {};
    tasksNeedingReassignment.forEach(task => {
      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = [];
      }
      tasksByProject[task.project_id].push(task);
    });
    
    console.log(`\n📁 Tasks by project:`);
    Object.entries(tasksByProject).forEach(([projectId, tasks]) => {
      console.log(`   Project ${projectId}: ${tasks.length} tasks`);
      tasks.forEach(task => {
        console.log(`     - Task ${task.id}: "${task.title}" (${task.status})`);
        if (task.assignee_ids) {
          console.log(`       Assignees: ${task.assignee_names?.join(', ') || 'Unknown'}`);
        }
        if (task.completed_by) {
          console.log(`       Completed by: ${task.completed_by_name || 'Unknown'}`);
        }
      });
    });
    
    // Generate reassignment plan
    console.log(`\n📋 Reassignment Plan:`);
    console.log(`   1. Create task_assignments records for multi-user tasks`);
    console.log(`   2. Update task_completions records for completed tasks`);
    console.log(`   3. Update project_tasks assignee_ids and completed_by fields`);
    
    // Save analysis results
    const analysisResults = {
      timestamp: new Date().toISOString(),
      totalTasks: originalTasks.length,
      tasksWithOldUserIds: assignmentAnalysis.tasksWithOldUserIds.length,
      uniqueOldUserIds: Array.from(assignmentAnalysis.uniqueOldUserIds),
      userMapping: Object.fromEntries(userMapping),
      tasksByProject,
      tasksNeedingReassignment: tasksNeedingReassignment.map(task => ({
        id: task.id,
        title: task.title,
        project_id: task.project_id,
        status: task.status,
        assignee_ids: task.assignee_ids,
        assignee_names: task.assignee_names,
        completed_by: task.completed_by,
        completed_by_name: task.completed_by_name
      }))
    };
    
    // Write results to file
    const fs = await import('fs');
    fs.writeFileSync('task-assignment-analysis.json', JSON.stringify(analysisResults, null, 2));
    console.log(`\n💾 Analysis saved to task-assignment-analysis.json`);
    
    return analysisResults;
    
  } catch (error) {
    console.error('❌ Error analyzing task assignments:', error);
  }
}

// Run the analysis
analyzeTaskAssignments(); 