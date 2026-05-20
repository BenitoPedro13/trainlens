-- TimescaleDB continuous aggregates on DailyMetrics (no-op when extension is absent).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable(
      '"DailyMetrics"',
      by_range('date'),
      if_not_exists => TRUE,
      migrate_data => TRUE
    );

    EXECUTE $cagg$
      CREATE MATERIALIZED VIEW IF NOT EXISTS daily_metrics_weekly
      WITH (timescaledb.continuous) AS
      SELECT
        "userId",
        time_bucket(INTERVAL '1 week', date) AS bucket,
        SUM("totalDistanceMeters") AS distance_meters,
        SUM(tss) AS tss,
        SUM("totalActivities") AS activity_count
      FROM "DailyMetrics"
      GROUP BY "userId", bucket
      WITH NO DATA
    $cagg$;

    EXECUTE $cagg$
      CREATE MATERIALIZED VIEW IF NOT EXISTS daily_metrics_monthly
      WITH (timescaledb.continuous) AS
      SELECT
        "userId",
        time_bucket(INTERVAL '1 month', date) AS bucket,
        SUM("totalDistanceMeters") AS distance_meters,
        SUM(tss) AS tss,
        SUM("totalActivities") AS activity_count
      FROM "DailyMetrics"
      GROUP BY "userId", bucket
      WITH NO DATA
    $cagg$;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'DailyMetrics continuous aggregates skipped: %', SQLERRM;
END
$do$;
