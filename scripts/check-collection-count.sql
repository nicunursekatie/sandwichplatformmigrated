-- Check total number of sandwich collections and date range
SELECT 
  COUNT(*) as total_collections,
  MIN(collection_date) as earliest_date,
  MAX(collection_date) as latest_date,
  MIN(submitted_at) as earliest_submitted,
  MAX(submitted_at) as latest_submitted
FROM sandwich_collections;

-- Check distribution by year (handling empty dates)
SELECT 
  CASE 
    WHEN collection_date IS NULL OR collection_date = '' OR collection_date = ' ' THEN 'Invalid Date'
    ELSE EXTRACT(YEAR FROM collection_date::date)::text
  END as year,
  COUNT(*) as count
FROM sandwich_collections
GROUP BY year
ORDER BY year DESC;

-- Check if there are any collections before 2022-12-21
SELECT COUNT(*) as collections_before_dec_2022
FROM sandwich_collections
WHERE collection_date < '2022-12-21';

-- Sample some early records
SELECT id, collection_date, host_name, individual_sandwiches, submitted_at
FROM sandwich_collections
WHERE collection_date < '2022-01-01'
  AND collection_date IS NOT NULL 
  AND collection_date != ''
  AND collection_date != ' '
ORDER BY collection_date ASC
LIMIT 10;

-- Check for records with invalid dates
SELECT COUNT(*) as invalid_date_count
FROM sandwich_collections
WHERE collection_date IS NULL 
   OR collection_date = '' 
   OR collection_date = ' '
   OR collection_date !~ '^\d{4}-\d{2}-\d{2}';

-- Sample some records with invalid dates
SELECT id, collection_date, host_name, submitted_at
FROM sandwich_collections
WHERE collection_date IS NULL 
   OR collection_date = '' 
   OR collection_date = ' '
LIMIT 10;