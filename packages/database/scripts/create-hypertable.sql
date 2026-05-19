-- This migration is applied after Prisma creates the Activity table.
-- It converts the Activity table to a TimescaleDB hypertable partitioned by startedAt.
--
-- Run after: prisma migrate deploy
-- See: https://docs.timescale.com/use-timescale/latest/hypertables/create/

SELECT create_hypertable(
  '"Activity"',
  by_range('startedAt'),
  if_not_exists => TRUE
);

-- Verify the hypertable was created
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'Activity';
