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
      COUNT(*) as entry_count,
      COALESCE(SUM(sc.individual_sandwiches), 0)::bigint as individual_total,
      COALESCE(SUM(
        CASE 
          WHEN sc.group_collections IS NOT NULL AND sc.group_collections != '[]' AND sc.group_collections != '' THEN
            -- Try to parse JSON and sum sandwich counts
            (SELECT COALESCE(SUM(
              CASE 
                WHEN jsonb_typeof(value) = 'object' THEN
                  COALESCE((value->>'sandwichCount')::int, (value->>'sandwich_count')::int, (value->>'count')::int, 0)
                WHEN jsonb_typeof(value) = 'number' THEN
                  value::int
                ELSE 0
              END
            ), 0)
            FROM jsonb_array_elements(sc.group_collections::jsonb))
          ELSE 0
        END
      ), 0)::bigint as group_total
    FROM sandwich_collections sc
  )
  SELECT 
    entry_count::bigint as total_entries,
    individual_total::bigint as individual_sandwiches,
    group_total::bigint as group_sandwiches,
    (individual_total + group_total)::bigint as complete_total_sandwiches
  FROM stats;
END;
$$ LANGUAGE plpgsql;
