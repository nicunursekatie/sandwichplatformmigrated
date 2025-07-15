-- Fix the project_congratulations foreign key constraint that's preventing project deletion
-- Run this in your Supabase SQL editor

-- Drop the existing foreign key constraint
ALTER TABLE project_congratulations 
DROP CONSTRAINT IF EXISTS project_congratulations_project_id_fkey;

-- Add the foreign key back with CASCADE delete rule
ALTER TABLE project_congratulations
ADD CONSTRAINT project_congratulations_project_id_fkey 
FOREIGN KEY (project_id) 
REFERENCES projects(id) 
ON DELETE CASCADE;

-- Verify the change
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'project_congratulations'
    AND ccu.table_name = 'projects';

-- Test: Now you should be able to delete projects!