-- Repair Activity constraints after a failed Prisma drift migration.
-- Safe to run multiple times. See ADR-002 / packages/database/scripts/create-hypertable.sql

ALTER TABLE "ActivityRawPayload" DROP CONSTRAINT IF EXISTS "ActivityRawPayload_activityId_fkey";

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey";

SELECT create_hypertable(
  '"Activity"',
  by_range('startedAt'),
  if_not_exists => TRUE
);

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id, "startedAt");

DROP INDEX IF EXISTS "Activity_userId_provider_externalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Activity_userId_provider_externalId_startedAt_key"
  ON "Activity"("userId", provider, "externalId", "startedAt");
