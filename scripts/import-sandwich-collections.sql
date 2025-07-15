TRUNCATE TABLE sandwich_collections RESTART IDENTITY;
CREATE TEMP TABLE sandwich_collections_staging (
  id INT,
  host_name TEXT,
  individual_sandwiches INT,
  collection_date TEXT,
  group_collections TEXT,
  group_count INT,
  submitted_at TEXT
);
COPY sandwich_collections_staging (id, host_name, individual_sandwiches, collection_date, group_collections, group_count, submitted_at)
FROM '/app/sandwich-collections-all-2025-07-07_cleaned_copy.csv'
WITH (FORMAT csv, HEADER true);
INSERT INTO sandwich_collections (host_name, individual_sandwiches, collection_date, group_collections, submitted_at)
SELECT
  host_name,
  individual_sandwiches,
  collection_date,
  group_collections,
  CASE
    WHEN submitted_at IS NOT NULL AND submitted_at <> ''
      THEN TO_TIMESTAMP(submitted_at, 'MM/DD/YYYY, HH12:MI:SS AM')
    ELSE NULL
  END
FROM sandwich_collections_staging;
DROP TABLE sandwich_collections_staging; 