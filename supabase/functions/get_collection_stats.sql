-- Create the get_collection_stats RPC function
CREATE OR REPLACE FUNCTION get_collection_stats()
RETURNS TABLE (
  totalCollections bigint,
  totalSandwiches bigint,
  totalVolunteers bigint,
  totalVolunteerHours numeric,
  avgSandwichesPerCollection numeric,
  avgVolunteersPerCollection numeric,
  avgVolunteerHoursPerCollection numeric,
  totalValue numeric,
  totalMileage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as totalCollections,
    COALESCE(SUM(number_of_sandwiches), 0)::bigint as totalSandwiches,
    COALESCE(SUM(number_of_volunteers), 0)::bigint as totalVolunteers,
    COALESCE(SUM(volunter_hours), 0)::numeric as totalVolunteerHours,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(AVG(number_of_sandwiches), 2)
      ELSE 0
    END as avgSandwichesPerCollection,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(AVG(number_of_volunteers), 2)
      ELSE 0
    END as avgVolunteersPerCollection,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(AVG(volunter_hours), 2)
      ELSE 0
    END as avgVolunteerHoursPerCollection,
    COALESCE(SUM(value_of_donation), 0)::numeric as totalValue,
    COALESCE(SUM(mileage), 0)::numeric as totalMileage
  FROM collections;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_collection_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_stats() TO anon;