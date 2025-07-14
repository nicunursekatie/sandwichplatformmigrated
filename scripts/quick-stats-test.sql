-- Quick test of sandwich collection stats

-- 1. Check if RPC function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_collection_stats'
) as function_exists;

-- 2. If it exists, run it
SELECT * FROM get_collection_stats();

-- 3. Manual calculation for comparison
SELECT 
  COUNT(*) as total_entries,
  SUM(individual_sandwiches) as total_individual,
  COUNT(CASE WHEN group_collections != '[]' THEN 1 END) as entries_with_groups
FROM sandwich_collections;

-- 4. Show the actual totals
SELECT 
  SUM(individual_sandwiches) as individual_total,
  'Check group_collections column for group totals' as note
FROM sandwich_collections;