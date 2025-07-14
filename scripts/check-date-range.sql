-- 1. Get the complete date range and total count
SELECT 
  COUNT(*) as total_records,
  MIN(collection_date) as earliest_date,
  MAX(collection_date) as latest_date,
  COUNT(DISTINCT EXTRACT(YEAR FROM collection_date::date)) as unique_years
FROM sandwich_collections
WHERE collection_date IS NOT NULL 
  AND collection_date != ''
  AND collection_date ~ '^\d{4}-\d{2}-\d{2}';

-- 2. Count records by year
SELECT 
  EXTRACT(YEAR FROM collection_date::date) as year,
  COUNT(*) as record_count,
  MIN(collection_date) as earliest_in_year,
  MAX(collection_date) as latest_in_year
FROM sandwich_collections
WHERE collection_date ~ '^\d{4}-\d{2}-\d{2}'
GROUP BY year
ORDER BY year;

-- 3. Check if there are ANY records before 2025
SELECT COUNT(*) as records_before_2025
FROM sandwich_collections
WHERE collection_date < '2025-01-01'
  AND collection_date ~ '^\d{4}-\d{2}-\d{2}';

-- 4. Get the first 10 records by ID to see original data
SELECT id, collection_date, host_name, submitted_at
FROM sandwich_collections
ORDER BY id ASC
LIMIT 10;

-- 5. Get the last 10 records by ID
SELECT id, collection_date, host_name, submitted_at
FROM sandwich_collections
ORDER BY id DESC
LIMIT 10;

-- 6. Check if this is the actual total or if there's more data
SELECT 
  COUNT(*) as total_in_table,
  MAX(id) as highest_id,
  MIN(id) as lowest_id
FROM sandwich_collections;