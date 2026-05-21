-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "averageGrade" DOUBLE PRECISION,
    "maximumGrade" DOUBLE PRECISION,
    "elevationHigh" DOUBLE PRECISION,
    "elevationLow" DOUBLE PRECISION,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "climbCategory" INTEGER,
    "city" TEXT,
    "country" TEXT,
    "polyline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentEffort" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "activityExternalId" TEXT NOT NULL,
    "externalEffortId" TEXT NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "movingSeconds" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "averageWatts" DOUBLE PRECISION,
    "averageHeartRate" DOUBLE PRECISION,
    "maxHeartRate" DOUBLE PRECISION,
    "prRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentEffort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentLeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "athleteName" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentLeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Segment_externalId_key" ON "Segment"("externalId");

-- CreateIndex
CREATE INDEX "Segment_provider_activityType_idx" ON "Segment"("provider", "activityType");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentEffort_externalEffortId_key" ON "SegmentEffort"("externalEffortId");

-- CreateIndex
CREATE INDEX "SegmentEffort_userId_segmentId_startDate_idx" ON "SegmentEffort"("userId", "segmentId", "startDate" DESC);

-- CreateIndex
CREATE INDEX "SegmentEffort_segmentId_elapsedSeconds_idx" ON "SegmentEffort"("segmentId", "elapsedSeconds");

-- CreateIndex
CREATE INDEX "SegmentLeaderboardSnapshot_segmentId_capturedAt_idx" ON "SegmentLeaderboardSnapshot"("segmentId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "SegmentLeaderboardSnapshot_userId_idx" ON "SegmentLeaderboardSnapshot"("userId");

-- AddForeignKey
ALTER TABLE "SegmentEffort" ADD CONSTRAINT "SegmentEffort_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentEffort" ADD CONSTRAINT "SegmentEffort_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentLeaderboardSnapshot" ADD CONSTRAINT "SegmentLeaderboardSnapshot_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentLeaderboardSnapshot" ADD CONSTRAINT "SegmentLeaderboardSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
