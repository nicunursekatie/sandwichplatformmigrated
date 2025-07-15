import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
  console.log('Checking projects table...');
  
  try {
    // Check if projects table exists and has data
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    console.log(`Found ${projects?.length || 0} projects`);
    console.log('Projects:', projects);
    
    // Check total count
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting projects:', countError);
    } else {
      console.log(`Total projects in database: ${count}`);
    }
    
    // Check by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('projects')
      .select('status');
    
    if (statusError) {
      console.error('Error fetching status counts:', statusError);
    } else {
      const counts = {};
      statusCounts?.forEach(project => {
        counts[project.status] = (counts[project.status] || 0) + 1;
      });
      console.log('Projects by status:', counts);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProjects(); 