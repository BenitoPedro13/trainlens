-- AlterTable
ALTER TABLE "User" ADD COLUMN "ftpWatts" INTEGER,
ADD COLUMN "maxHeartRate" INTEGER,
ADD COLUMN "weightKg" DOUBLE PRECISION,
ADD COLUMN "thresholdPaceSecondsPerKm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "estimatedPowerWatts" DOUBLE PRECISION;
