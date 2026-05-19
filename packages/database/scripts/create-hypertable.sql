-- =============================================================================
-- TimescaleDB hypertable setup for the Activity table.
-- =============================================================================
-- Context:
--   TimescaleDB requires the partition column (startedAt) to be part of every
--   unique constraint including the primary key. Prisma doesn't support composite
--   PKs for single-column @id fields, so we handle this in a raw SQL migration.
--
-- Steps:
--   1. Drop the existing primary key on Activity (just the constraint, not the column)
--   2. Re-create it as a composite PK (id, startedAt)  
--   3. Update the unique constraint to include startedAt
--   4. Create the hypertable
--
-- Run AFTER: prisma migrate deploy (or prisma db push)
-- See ADR-002 for TimescaleDB design decisions.
-- =============================================================================

-- Step 1: Drop the existing PK constraint
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey";

-- Step 2: Re-create as composite PK including the partition column
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id, "startedAt");

-- Step 3: Update the unique constraint to include startedAt
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_userId_provider_externalId_key";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_provider_externalId_startedAt_key"
  UNIQUE ("userId", provider, "externalId", "startedAt");

-- Step 4: Create the hypertable (idempotent with if_not_exists)
SELECT create_hypertable(
  '"Activity"',
  by_range('startedAt'),
  if_not_exists => TRUE
);

-- Verify
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'Activity';
