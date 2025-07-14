-- Potential fixes for sandwich count issues
-- ONLY RUN THESE AFTER REVIEWING THE DIAGNOSTIC RESULTS!

-- Option 1: If you have a total_sandwiches or sandwich_count column that should be individual_sandwiches
-- UPDATE sandwich_collections
-- SET individual_sandwiches = total_sandwiches
-- WHERE individual_sandwiches IS NULL OR individual_sandwiches = 0;

-- Option 2: If all sandwiches are stored in group_collections and individual should be 0
-- This is fine, the RPC function will calculate from group_collections

-- Option 3: If you need to parse sandwich counts from a text field or different format
-- Example: If data is in a format like "50 sandwiches"
-- UPDATE sandwich_collections
-- SET individual_sandwiches = CAST(REGEXP_REPLACE(some_text_field, '[^0-9]', '', 'g') AS INTEGER)
-- WHERE individual_sandwiches IS NULL OR individual_sandwiches = 0;

-- Option 4: If the total (875,930) is correct but stored differently
-- You might need to check how this total is being calculated
-- It could be coming from a different table or calculation

-- After fixing, verify the results:
SELECT * FROM get_collection_stats();

-- Also check a few records to ensure the data looks correct:
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  group_collections
FROM sandwich_collections
ORDER BY submitted_at DESC
LIMIT 20;