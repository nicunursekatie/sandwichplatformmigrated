-- 1. Get the absolute total count of ALL records
SELECT COUNT(*) as absolute_total_count FROM sandwich_collections;

-- 2. Check if Row Level Security (RLS) is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'sandwich_collections';

-- 3. Check what the current user can see
SELECT current_user, session_user;

-- 4. Try to get counts with different approaches
SELECT 
  (SELECT COUNT(*) FROM sandwich_collections) as direct_count,
  (SELECT COUNT(*) FROM public.sandwich_collections) as public_schema_count;

-- 5. Get earliest and latest dates (with better NULL handling)
SELECT 
  COUNT(*) as total_records,
  COUNT(collection_date) as records_with_valid_dates,
  COUNT(*) - COUNT(collection_date) as records_with_null_dates,
  MIN(CASE WHEN collection_date != '' THEN collection_date END) as earliest_date,
  MAX(CASE WHEN collection_date != '' THEN collection_date END) as latest_date
FROM sandwich_collections;

-- 6. Check date distribution more carefully
SELECT 
  CASE 
    WHEN collection_date IS NULL THEN 'NULL'
    WHEN collection_date = '' THEN 'Empty String'
    WHEN collection_date = ' ' THEN 'Space'
    WHEN collection_date ~ '^\d{4}' THEN SUBSTRING(collection_date, 1, 4)
    ELSE 'Invalid Format'
  END as year_or_status,
  COUNT(*) as count
FROM sandwich_collections
GROUP BY year_or_status
ORDER BY year_or_status;

-- 7. Get a sample of 50 records to see what's actually in the table
SELECT 
  id,
  collection_date,
  host_name,
  individual_sandwiches,
  submitted_at
FROM sandwich_collections
ORDER BY 
  CASE 
    WHEN collection_date ~ '^\d{4}-\d{2}-\d{2}' THEN collection_date::date 
    ELSE NULL 
  END DESC NULLS LAST
LIMIT 50;

-- 8. Check if there are any RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sandwich_collections';