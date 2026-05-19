-- =============================================================================
-- Convert Activity to a TimescaleDB hypertable partitioned by startedAt.
-- TimescaleDB requires the partition column to be part of every unique index.
-- =============================================================================

-- Drop FK that depends on the simple PK
ALTER TABLE "ActivityRawPayload" DROP CONSTRAINT IF EXISTS "ActivityRawPayload_activityId_fkey";

-- Drop single-column PK
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey";

-- Drop unique constraint that lacks the partition column
DROP INDEX IF EXISTS "Activity_userId_provider_externalId_key";

-- Create hypertable (must run outside a wrapping transaction in some TS versions;
-- Prisma migrate wraps each migration in a transaction, which works in TimescaleDB 2.x+)
SELECT create_hypertable(
  '"Activity"',
  by_range('startedAt'),
  if_not_exists => TRUE
);

-- Re-create PK as composite (id, startedAt) — required by TimescaleDB
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id, "startedAt");

-- Re-create unique constraint including the partition column
CREATE UNIQUE INDEX IF NOT EXISTS "Activity_userId_provider_externalId_startedAt_key"
  ON "Activity"("userId", provider, "externalId", "startedAt");
