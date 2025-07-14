-- Debug why get_collection_stats returns no rows

-- 1. First check if there's data in the table
SELECT COUNT(*) as record_count FROM sandwich_collections;

-- 2. Check the sum of individual sandwiches
SELECT 
  COUNT(*) as total_records,
  SUM(individual_sandwiches) as sum_individual
FROM sandwich_collections;

-- 3. Try the function query manually
WITH stats AS (
  SELECT 
    COUNT(*) as entry_count,
    COALESCE(SUM(sc.individual_sandwiches), 0)::bigint as individual_total,
    0::bigint as group_total  -- Simplified for testing
  FROM sandwich_collections sc
)
SELECT 
  entry_count::bigint as total_entries,
  individual_total::bigint as individual_sandwiches,
  group_total::bigint as group_sandwiches,
  (individual_total + group_total)::bigint as complete_total_sandwiches
FROM stats;

-- 4. Test the function again
SELECT * FROM get_collection_stats();

-- 5. Check if the function exists and its definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_collection_stats';