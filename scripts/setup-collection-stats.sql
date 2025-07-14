-- Function to get sandwich collection statistics
CREATE OR REPLACE FUNCTION get_collection_stats()
RETURNS TABLE (
  total_entries bigint,
  individual_sandwiches bigint,
  group_sandwiches bigint,
  complete_total_sandwiches bigint
) AS $$
DECLARE
  v_entry_count bigint;
  v_individual_total bigint;
  v_group_total bigint;
BEGIN
  -- Calculate totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(sc.individual_sandwiches), 0)::bigint,
    COALESCE(SUM(
      CASE 
        WHEN sc.group_collections IS NOT NULL AND sc.group_collections != '[]' AND sc.group_collections != '' THEN
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
          FROM jsonb_array_elements(sc.group_collections::jsonb))
        ELSE 0
      END
    ), 0)::bigint
  INTO v_entry_count, v_individual_total, v_group_total
  FROM sandwich_collections sc;

  -- Return the results
  RETURN QUERY SELECT 
    v_entry_count,
    v_individual_total,
    v_group_total,
    v_individual_total + v_group_total;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to use the function
GRANT EXECUTE ON FUNCTION get_collection_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_stats() TO anon; 