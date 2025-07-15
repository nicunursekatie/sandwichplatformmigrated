import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use service role key to bypass RLS
const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA2ODkwNiwiZXhwIjoyMDY3NjQ0OTA2fQ.kVHVOE9KCuRnAA1F2-BEdtdDWCaq3PFCilwEoWkvL-Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const filePath = path.join('attached_assets', 'projects (2).json');

const allowedFields = [
  'title',
  'description',
  'status',
  'priority',
  'category',
  'due_date',
  'start_date',
  'created_at',
  'updated_at',
  'assignee_id',
  'assignee_name',
  'progress_percentage',
  'notes',
  'tags',
  'estimated_hours',
  'actual_hours',
  'budget'
];

async function importProjects() {
  if (supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Please set your SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('📋 To get your service role key:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to Settings > API');
    console.log('   3. Copy the "service_role" key (not the anon key)');
    console.log('   4. Run: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
    console.log('   5. Then run this script again');
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const projects = JSON.parse(raw);
  let success = 0;
  let failed = 0;

  console.log(`📦 Importing ${projects.length} projects...`);

  for (const project of projects) {
    // Map only allowed fields
    const record = {};
    for (const key of allowedFields) {
      if (project[key] !== undefined) {
        record[key] = project[key];
      }
    }
    
    // Insert into Supabase
    const { error } = await supabase.from('projects').insert(record);
    if (error) {
      console.error(`❌ Failed to insert project '${project.title}':`, error.message);
      failed++;
    } else {
      console.log(`✅ Inserted project: ${project.title}`);
      success++;
    }
  }
  
  console.log(`\n🎉 Import complete. Success: ${success}, Failed: ${failed}`);
  
  if (success > 0) {
    console.log('🔄 Your projects should now appear in the app!');
  }
}

importProjects(); 