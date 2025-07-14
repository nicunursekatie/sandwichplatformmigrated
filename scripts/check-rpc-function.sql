-- Check if the RPC function exists and test it
-- Run this in your Supabase SQL editor

-- 1. Check if the function exists
SELECT 
  proname as function_name,
  pronargs as num_arguments,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'get_collection_stats';

-- 2. Test the function
SELECT * FROM get_collection_stats();

-- 3. Manually calculate to compare
SELECT 
  COUNT(*) as total_entries,
  COALESCE(SUM(individual_sandwiches), 0) as sum_individual,
  COUNT(CASE WHEN group_collections != '[]' AND group_collections != '' THEN 1 END) as records_with_groups
FROM sandwich_collections;

-- 4. Check some records with group collections
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections,
  LENGTH(group_collections) as group_length,
  CASE 
    WHEN group_collections = '[]' THEN 'empty array'
    WHEN group_collections = '' THEN 'empty string'
    ELSE 'has data'
  END as group_status
FROM sandwich_collections
WHERE group_collections != '[]'
LIMIT 20;

-- 5. Try parsing group_collections JSON
SELECT 
  id,
  individual_sandwiches,
  group_collections,
  group_collections::jsonb as parsed_json,
  (SELECT SUM((value->>'count')::int) 
   FROM jsonb_array_elements(group_collections::jsonb) 
   WHERE jsonb_typeof(value) = 'object') as group_total
FROM sandwich_collections
WHERE group_collections != '[]' AND group_collections != ''
LIMIT 10;