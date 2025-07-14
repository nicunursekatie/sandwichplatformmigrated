-- Test script to debug sandwich count totals

-- 1. First, let's see the raw totals
SELECT 
  COUNT(*) as total_entries,
  SUM(individual_sandwiches) as sum_individual,
  MIN(individual_sandwiches) as min_individual,
  MAX(individual_sandwiches) as max_individual,
  AVG(individual_sandwiches) as avg_individual
FROM sandwich_collections;

-- 2. Check if there are any NULL values
SELECT 
  COUNT(*) as total_records,
  COUNT(individual_sandwiches) as non_null_individual,
  COUNT(*) - COUNT(individual_sandwiches) as null_individual
FROM sandwich_collections;

-- 3. Sample some records to see the data
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections,
  CASE 
    WHEN individual_sandwiches IS NULL THEN 'NULL'
    WHEN individual_sandwiches = 0 THEN 'ZERO'
    ELSE 'HAS VALUE'
  END as individual_status
FROM sandwich_collections
ORDER BY submitted_at DESC
LIMIT 20;

-- 4. Test the RPC function
SELECT * FROM get_collection_stats();

-- 5. Try a manual calculation like the RPC function does
WITH manual_calc AS (
  SELECT 
    COUNT(*) as entries,
    COALESCE(SUM(individual_sandwiches), 0) as individual_total,
    COALESCE(SUM(
      CASE 
        WHEN group_collections != '[]' AND group_collections != '' AND group_collections IS NOT NULL THEN
          (SELECT COALESCE(SUM((value->>'count')::int), 0) 
           FROM jsonb_array_elements(group_collections::jsonb))
        ELSE 0
      END
    ), 0) as group_total
  FROM sandwich_collections
)
SELECT 
  entries,
  individual_total,
  group_total,
  individual_total + group_total as complete_total
FROM manual_calc;

-- 6. Check for any parsing errors in group_collections
SELECT 
  id,
  group_collections,
  CASE 
    WHEN group_collections = '[]' THEN 'empty array'
    WHEN group_collections = '' THEN 'empty string'
    WHEN group_collections IS NULL THEN 'null'
    ELSE 'has data'
  END as status
FROM sandwich_collections
WHERE group_collections != '[]'
LIMIT 20;