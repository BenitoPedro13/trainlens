import type { AthleteThresholds } from '@trainlens/shared';
import { resolveAthleteThresholds } from '@trainlens/shared';
import type { DatabaseService } from '../database/database.service';

export async function getAthleteThresholdsForUser(
  db: DatabaseService,
  userId: string,
): Promise<AthleteThresholds> {
  const user = await db.client.user.findUnique({
    where: { id: userId },
    select: {
      ftpWatts: true,
      maxHeartRate: true,
      weightKg: true,
      thresholdPaceSecondsPerKm: true,
    },
  });
  return resolveAthleteThresholds(user);
}
