-- Check for potential double counting in sandwich collections

-- 1. Find records where individual_sandwiches might match group counts
WITH parsed_groups AS (
  SELECT 
    id,
    collection_date,
    host_name,
    individual_sandwiches,
    group_collections,
    CASE 
      WHEN group_collections != '[]' AND group_collections != '' THEN
        (SELECT SUM((value->>'count')::int) 
         FROM jsonb_array_elements(group_collections::jsonb) 
         WHERE jsonb_typeof(value) = 'object')
      ELSE 0
    END as group_total
  FROM sandwich_collections
)
SELECT 
  *,
  CASE 
    WHEN individual_sandwiches = group_total AND group_total > 0 THEN 'POSSIBLE DOUBLE COUNT'
    WHEN group_total > 0 THEN 'Has both individual and group'
    ELSE 'Individual only'
  END as status
FROM parsed_groups
WHERE group_total > 0 OR individual_sandwiches > 0
ORDER BY submitted_at DESC
LIMIT 50;

-- 2. Summary of the issue
WITH parsed_groups AS (
  SELECT 
    individual_sandwiches,
    CASE 
      WHEN group_collections != '[]' AND group_collections != '' THEN
        (SELECT SUM((value->>'count')::int) 
         FROM jsonb_array_elements(group_collections::jsonb) 
         WHERE jsonb_typeof(value) = 'object')
      ELSE 0
    END as group_total
  FROM sandwich_collections
)
SELECT 
  COUNT(*) as total_records,
  SUM(individual_sandwiches) as sum_individual,
  SUM(group_total) as sum_groups,
  SUM(individual_sandwiches) + SUM(group_total) as total_if_added,
  COUNT(CASE WHEN individual_sandwiches > 0 AND group_total > 0 THEN 1 END) as records_with_both,
  COUNT(CASE WHEN individual_sandwiches = group_total AND group_total > 0 THEN 1 END) as possible_double_counts
FROM parsed_groups;

-- 3. Show all records that have data in group_collections
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections
FROM sandwich_collections
WHERE group_collections != '[]' AND group_collections != ''
ORDER BY submitted_at DESC;

-- 4. Test what the RPC function returns
SELECT * FROM get_collection_stats();