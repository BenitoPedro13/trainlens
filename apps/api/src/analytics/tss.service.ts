import { Injectable, Logger } from '@nestjs/common';
import { calculateActivityTss } from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TssService {
  private readonly logger = new Logger(TssService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Compute and persist TSS for activities missing it (or all when force). */
  async backfillForUser(userId: string, options?: { from?: Date; force?: boolean }): Promise<number> {
    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(options?.from && { startedAt: { gte: options.from } }),
        ...(options?.force ? {} : { tss: null }),
      },
      select: {
        id: true,
        startedAt: true,
        activityType: true,
        durationSeconds: true,
        averageHeartRate: true,
        maxHeartRate: true,
        averagePowerWatts: true,
        normalizedPowerWatts: true,
        averagePaceSecondsPerKm: true,
      },
    });

    let updated = 0;
    for (const a of activities) {
      const tss = calculateActivityTss({
        durationSeconds: a.durationSeconds,
        activityType: a.activityType,
        averageHeartRate: a.averageHeartRate,
        maxHeartRate: a.maxHeartRate,
        averagePowerWatts: a.averagePowerWatts,
        normalizedPowerWatts: a.normalizedPowerWatts,
        averagePaceSecondsPerKm: a.averagePaceSecondsPerKm,
      });

      await this.db.client.activity.update({
        where: { id_startedAt: { id: a.id, startedAt: a.startedAt } },
        data: { tss },
      });
      updated++;
    }

    if (updated > 0) {
      this.logger.debug(`Backfilled TSS for ${updated} activities (user ${userId})`);
    }
    return updated;
  }
}
