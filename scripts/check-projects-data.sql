-- Check what's in the projects table
SELECT 
  id,
  title,
  description,
  status,
  priority,
  category,
  created_at,
  updated_at
FROM projects
ORDER BY created_at DESC
LIMIT 20;

-- Count total projects
SELECT COUNT(*) as total_projects FROM projects;

-- Check for any projects with specific statuses
SELECT 
  status,
  COUNT(*) as count
FROM projects
GROUP BY status
ORDER BY count DESC;

-- Check the most recent projects
SELECT 
  id,
  title,
  status,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10; 