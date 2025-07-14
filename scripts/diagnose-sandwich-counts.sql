-- Diagnostic script to check sandwich_collections data
-- Run this in your Supabase SQL editor to diagnose the issue

-- 1. Check a sample of records to see what data is in the table
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections,
  submitted_at
FROM sandwich_collections
ORDER BY submitted_at DESC
LIMIT 10;

-- 2. Check how many records have null or 0 individual_sandwiches
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN individual_sandwiches IS NULL THEN 1 END) as null_individual,
  COUNT(CASE WHEN individual_sandwiches = 0 THEN 1 END) as zero_individual,
  COUNT(CASE WHEN individual_sandwiches > 0 THEN 1 END) as positive_individual
FROM sandwich_collections;

-- 3. Check the distribution of group_collections data
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN group_collections IS NULL THEN 1 END) as null_groups,
  COUNT(CASE WHEN group_collections = '' THEN 1 END) as empty_groups,
  COUNT(CASE WHEN group_collections = '[]' THEN 1 END) as empty_array_groups,
  COUNT(CASE WHEN group_collections IS NOT NULL AND group_collections != '' AND group_collections != '[]' THEN 1 END) as has_groups
FROM sandwich_collections;

-- 4. Try to see what's in group_collections for records that have data
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections,
  LENGTH(group_collections) as group_length
FROM sandwich_collections
WHERE group_collections IS NOT NULL 
  AND group_collections != '' 
  AND group_collections != '[]'
LIMIT 10;

-- 5. Test the RPC function to see what it returns
SELECT * FROM get_collection_stats();

-- 6. If you have a different column name for sandwich count, check for it
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sandwich_collections' 
  AND table_schema = 'public'
ORDER BY ordinal_position;