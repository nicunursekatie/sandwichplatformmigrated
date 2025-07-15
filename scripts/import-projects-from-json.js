import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  const raw = fs.readFileSync(filePath, 'utf-8');
  const projects = JSON.parse(raw);
  let success = 0;
  let failed = 0;

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
      console.error(`Failed to insert project '${project.title}':`, error.message);
      failed++;
    } else {
      console.log(`Inserted project: ${project.title}`);
      success++;
    }
  }
  console.log(`\nImport complete. Success: ${success}, Failed: ${failed}`);
}

importProjects(); 