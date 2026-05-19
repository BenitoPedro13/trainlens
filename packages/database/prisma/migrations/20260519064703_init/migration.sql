-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('strava', 'garmin', 'apple_health', 'polar');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('active', 'paused', 'revoked', 'error');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('Run', 'Ride', 'Swim', 'Walk', 'Hike', 'VirtualRide', 'VirtualRun', 'WeightTraining', 'Yoga', 'Workout', 'CrossFit', 'Rowing', 'StandUpPaddling', 'Kayaking', 'Skiing', 'Snowboard', 'Golf', 'Soccer', 'Tennis', 'Other');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "externalAthleteId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'active',
    "scope" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "syncErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "timezone" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "elevationGainMeters" DOUBLE PRECISION,
    "elevationLossMeters" DOUBLE PRECISION,
    "averageHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "averagePaceSecondsPerKm" DOUBLE PRECISION,
    "averagePowerWatts" DOUBLE PRECISION,
    "normalizedPowerWatts" DOUBLE PRECISION,
    "maxPowerWatts" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "calories" INTEGER,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "summaryPolyline" TEXT,
    "deviceName" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "tss" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRawPayload" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "payload" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityRawPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "totalDistanceMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalElevationGainMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCalories" INTEGER NOT NULL DEFAULT 0,
    "tss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctl" DOUBLE PRECISION,
    "atl" DOUBLE PRECISION,
    "tsb" DOUBLE PRECISION,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "Provider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "objectType" TEXT,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Connection_userId_idx" ON "Connection"("userId");

-- CreateIndex
CREATE INDEX "Connection_provider_status_idx" ON "Connection"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userId_provider_key" ON "Connection"("userId", "provider");

-- CreateIndex
CREATE INDEX "Activity_userId_startedAt_idx" ON "Activity"("userId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "Activity_userId_activityType_idx" ON "Activity"("userId", "activityType");

-- CreateIndex
CREATE INDEX "Activity_connectionId_idx" ON "Activity"("connectionId");

-- CreateIndex
CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_provider_externalId_key" ON "Activity"("userId", "provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRawPayload_activityId_key" ON "ActivityRawPayload"("activityId");

-- CreateIndex
CREATE INDEX "DailyMetrics_userId_date_idx" ON "DailyMetrics"("userId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_userId_date_key" ON "DailyMetrics"("userId", "date");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_status_idx" ON "WebhookEvent"("provider", "status");

-- CreateIndex
CREATE INDEX "WebhookEvent_userId_idx" ON "WebhookEvent"("userId");

-- CreateIndex
CREATE INDEX "WebhookEvent_externalId_provider_idx" ON "WebhookEvent"("externalId", "provider");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt" DESC);

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRawPayload" ADD CONSTRAINT "ActivityRawPayload_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
