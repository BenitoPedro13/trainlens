-- =============================================================================
-- TimescaleDB hypertable setup for the Activity table.
-- =============================================================================
-- Context:
--   TimescaleDB requires the partition column (startedAt) to be part of EVERY
--   unique constraint including the primary key. Prisma schema keeps @id on
--   `id` alone for ergonomic queries; we adjust the DB constraints here.
--
-- Side effects:
--   - Activity PK becomes composite (id, startedAt) in the DB
--   - The FK from ActivityRawPayload → Activity is removed (app-level integrity)
--   - Unique constraint on (userId, provider, externalId) now includes startedAt
--
-- Run AFTER: prisma migrate deploy (or prisma db push for dev)
-- See ADR-002 for TimescaleDB design decisions.
-- =============================================================================

BEGIN;

-- Step 1: Remove FK that depends on Activity's simple PK
ALTER TABLE "ActivityRawPayload" DROP CONSTRAINT IF EXISTS "ActivityRawPayload_activityId_fkey";

-- Step 2: Drop the Prisma-generated single-column primary key
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey";

-- Step 3: Drop unique constraint that lacks the partition column
DROP INDEX IF EXISTS "Activity_userId_provider_externalId_key";

-- Step 4: Create the TimescaleDB hypertable on startedAt
SELECT create_hypertable(
  '"Activity"',
  by_range('startedAt'),
  if_not_exists => TRUE
);

-- Step 5: Re-create PK as composite (required by TimescaleDB)
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id, "startedAt");

-- Step 6: Re-create unique constraint including the partition column
CREATE UNIQUE INDEX IF NOT EXISTS "Activity_userId_provider_externalId_startedAt_key"
  ON "Activity"("userId", provider, "externalId", "startedAt");

COMMIT;

-- Verify
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'Activity';
