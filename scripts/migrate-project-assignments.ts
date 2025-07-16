import { db } from "../server/db";
import { projects, projectAssignments, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateProjectAssignments() {
  console.log("Starting project assignments migration...");
  
  try {
    // Get all projects with assignee data
    const allProjects = await db.select().from(projects);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const project of allProjects) {
      // Skip if no assignee data
      if (!project.assigneeName && !project.assigneeNames && !project.assigneeId && (!project.assigneeIds || project.assigneeIds === '[]')) {
        skippedCount++;
        continue;
      }
      
      console.log(`\nProcessing project ${project.id}: ${project.title}`);
      
      // Check if assignments already exist for this project
      const existingAssignments = await db
        .select()
        .from(projectAssignments)
        .where(eq(projectAssignments.projectId, project.id));
      
      if (existingAssignments.length > 0) {
        console.log(`  - Skipping: Already has ${existingAssignments.length} assignments`);
        skippedCount++;
        continue;
      }
      
      // Handle different assignment formats
      const assignmentsToCreate: Array<{ userId: string; name: string }> = [];
      
      // Handle assigneeIds (JSON array of user IDs)
      if (project.assigneeIds && project.assigneeIds !== '[]') {
        try {
          const ids = JSON.parse(project.assigneeIds as string);
          if (Array.isArray(ids)) {
            for (const userId of ids) {
              if (userId) {
                assignmentsToCreate.push({ userId: String(userId), name: '' });
              }
            }
          }
        } catch (e) {
          console.log(`  - Error parsing assigneeIds: ${e}`);
        }
      }
      
      // Handle assigneeNames (comma-separated names)
      if (project.assigneeNames && assignmentsToCreate.length === 0) {
        const names = project.assigneeNames.split(',').map(n => n.trim()).filter(n => n);
        for (const name of names) {
          // Try to find user by full name
          const allUsers = await db.select().from(users);
          let matchingUser = null;
          
          // Try exact full name match
          for (const user of allUsers) {
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            if (fullName.toLowerCase() === name.toLowerCase()) {
              matchingUser = user;
              break;
            }
          }
          
          // Try first name only match
          if (!matchingUser) {
            const firstName = name.split(' ')[0];
            for (const user of allUsers) {
              if (user.firstName?.toLowerCase() === firstName.toLowerCase()) {
                matchingUser = user;
                break;
              }
            }
          }
          
          if (matchingUser) {
            assignmentsToCreate.push({ userId: matchingUser.id, name });
          } else {
            console.log(`  - Warning: Could not find user with name "${name}"`);
          }
        }
      }
      
      // Handle single assigneeName
      if (project.assigneeName && assignmentsToCreate.length === 0) {
        const name = project.assigneeName.trim();
        if (name) {
          // Try to find user by full name
          const allUsers = await db.select().from(users);
          let matchingUser = null;
          
          // Try exact full name match
          for (const user of allUsers) {
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            if (fullName.toLowerCase() === name.toLowerCase()) {
              matchingUser = user;
              break;
            }
          }
          
          // Try first name only match
          if (!matchingUser) {
            const firstName = name.split(' ')[0];
            for (const user of allUsers) {
              if (user.firstName?.toLowerCase() === firstName.toLowerCase()) {
                matchingUser = user;
                break;
              }
            }
          }
          
          if (matchingUser) {
            assignmentsToCreate.push({ userId: matchingUser.id, name });
          } else {
            console.log(`  - Warning: Could not find user with name "${name}"`);
          }
        }
      }
      
      // Handle single assigneeId
      if (project.assigneeId && assignmentsToCreate.length === 0) {
        assignmentsToCreate.push({ userId: String(project.assigneeId), name: '' });
      }
      
      // Create the assignments
      if (assignmentsToCreate.length > 0) {
        console.log(`  - Creating ${assignmentsToCreate.length} assignments`);
        
        for (const assignment of assignmentsToCreate) {
          try {
            await db.insert(projectAssignments).values({
              projectId: project.id,
              userId: assignment.userId,
              role: 'member'
            });
            console.log(`    ✓ Created assignment for user ${assignment.userId}${assignment.name ? ` (${assignment.name})` : ''}`);
          } catch (e) {
            console.log(`    ✗ Error creating assignment for user ${assignment.userId}: ${e}`);
          }
        }
        
        migratedCount++;
      } else {
        console.log(`  - No valid assignments to create`);
        skippedCount++;
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`- Migrated: ${migratedCount} projects`);
    console.log(`- Skipped: ${skippedCount} projects`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateProjectAssignments();