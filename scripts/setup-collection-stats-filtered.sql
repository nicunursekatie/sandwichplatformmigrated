-- Function to get sandwich collection statistics with filters
CREATE OR REPLACE FUNCTION get_collection_stats_filtered(
  host_name text DEFAULT NULL,
  collection_date_from date DEFAULT NULL,
  collection_date_to date DEFAULT NULL,
  individual_min int DEFAULT NULL,
  individual_max int DEFAULT NULL
)
RETURNS TABLE (
  total_entries bigint,
  individual_sandwiches bigint,
  group_sandwiches bigint,
  complete_total_sandwiches bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM sandwich_collections sc
    WHERE (host_name IS NULL OR sc.host_name = host_name)
      AND (collection_date_from IS NULL OR sc.collection_date >= collection_date_from)
      AND (collection_date_to IS NULL OR sc.collection_date <= collection_date_to)
      AND (individual_min IS NULL OR sc.individual_sandwiches >= individual_min)
      AND (individual_max IS NULL OR sc.individual_sandwiches <= individual_max)
  ),
  stats AS (
    SELECT 
      COUNT(*) as entry_count,
      COALESCE(SUM(f.individual_sandwiches), 0)::bigint as individual_total,
      COALESCE(SUM(
        CASE 
          WHEN f.group_collections IS NOT NULL AND f.group_collections != '[]' AND f.group_collections != '' THEN
            (SELECT COALESCE(SUM(
              CASE 
                WHEN jsonb_typeof(value) = 'object' THEN
                  COALESCE((value->>'sandwichCount')::int, (value->>'sandwich_count')::int, (value->>'count')::int, 0)
                WHEN jsonb_typeof(value) = 'number' THEN
                  value::int
                ELSE 0
              END
            ), 0)
            FROM jsonb_array_elements(f.group_collections::jsonb))
          ELSE 0
        END
      ), 0)::bigint as group_total
    FROM filtered f
  )
  SELECT 
    entry_count::bigint as total_entries,
    individual_total::bigint as individual_sandwiches,
    group_total::bigint as group_sandwiches,
    (individual_total + group_total)::bigint as complete_total_sandwiches
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to use the function
GRANT EXECUTE ON FUNCTION get_collection_stats_filtered(text, date, date, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_stats_filtered(text, date, date, int, int) TO anon;