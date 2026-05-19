-- Add optional passwordHash to User for Credentials provider (dev convenience).
-- In production, users authenticate exclusively via OAuth (Strava, etc.).
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
