-- Function to get sandwich collection statistics
CREATE OR REPLACE FUNCTION get_collection_stats()
RETURNS TABLE (
  total_entries bigint,
  individual_sandwiches bigint,
  group_sandwiches bigint,
  complete_total_sandwiches bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_entries,
      COALESCE(SUM(individual_sandwiches), 0) as individual_sandwiches,
      COALESCE(SUM(
        CASE 
          WHEN group_collections IS NOT NULL AND group_collections != '[]' AND group_collections != '' THEN
            -- Try to parse JSON and sum sandwich counts
            (SELECT COALESCE(SUM(
              CASE 
                WHEN jsonb_typeof(value) = 'object' THEN
                  COALESCE((value->>'sandwich_count')::int, (value->>'count')::int, 0)
                WHEN jsonb_typeof(value) = 'number' THEN
                  value::int
                ELSE 0
              END
            ), 0)
            FROM jsonb_array_elements(group_collections::jsonb))
          ELSE 0
        END
      ), 0) as group_sandwiches
    FROM sandwich_collections
  )
  SELECT 
    total_entries,
    individual_sandwiches,
    group_sandwiches,
    individual_sandwiches + group_sandwiches as complete_total_sandwiches
  FROM stats;
END;
$$ LANGUAGE plpgsql; 