const { DatabaseStorage } = require('./server/database-storage');

async function debugAPI() {
  try {
    console.log('Testing API storage methods...');
    const storage = new DatabaseStorage();
    
    // Test getting all projects
    console.log('\n=== Testing getAllProjects ===');
    const projects = await storage.getAllProjects();
    console.log('Projects found:', projects.length);
    console.log('First project:', projects[0]);
    
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log('\n=== Testing getProjectAssignments ===');
      const assignments = await storage.getProjectAssignments(firstProject.id);
      console.log('Assignments for project', firstProject.id, ':', assignments);
      
      console.log('\n=== Testing getProject ===');
      const project = await storage.getProject(firstProject.id);
      console.log('Single project:', project);
    }
    
    // Test getting all users
    console.log('\n=== Testing getAllUsers ===');
    const users = await storage.getAllUsers();
    console.log('Users found:', users.length);
    console.log('First user:', users[0]);
    
  } catch (error) {
    console.error('Error testing API:', error);
    console.error('Stack:', error.stack);
  }
}

debugAPI();