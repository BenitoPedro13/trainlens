-- Add idempotency key for Strava webhook deduplication (ADR-013)
ALTER TABLE "WebhookEvent" ADD COLUMN "idempotencyKey" TEXT;

-- Backfill not needed (no production data); enforce NOT NULL + unique for new rows
UPDATE "WebhookEvent" SET "idempotencyKey" = "id" WHERE "idempotencyKey" IS NULL;

ALTER TABLE "WebhookEvent" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");
