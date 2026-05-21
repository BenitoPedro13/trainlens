import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SegmentPersistenceService } from './segment-persistence.service';
import { normalizeSegmentEffort } from '../strava/strava.normalizer';
import type { StravaDetailActivity } from '../strava/strava.types';

@Injectable()
export class SegmentBackfillService {
  private readonly logger = new Logger(SegmentBackfillService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly segmentPersistence: SegmentPersistenceService,
  ) {}

  async runForUser(userId: string): Promise<{ processed: number; efforts: number }> {
    const activities = await this.db.client.activity.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, externalId: true },
    });

    const externalIdMap = new Map(activities.map((a) => [a.id, a.externalId]));
    const activityIds = activities.map((a) => a.id);

    const rawPayloads = await this.db.client.activityRawPayload.findMany({
      where: { activityId: { in: activityIds } },
    });

    let processed = 0;
    let effortCount = 0;

    for (const rp of rawPayloads) {
      const payload = rp.payload as Record<string, unknown>;
      const detail = payload['detail'] as StravaDetailActivity | undefined;

      if (!detail?.segment_efforts?.length) continue;

      const externalId = externalIdMap.get(rp.activityId) ?? rp.activityId;
      const normalized = detail.segment_efforts.map((e) =>
        normalizeSegmentEffort(e, externalId),
      );

      await this.segmentPersistence.upsertEfforts(userId, normalized).catch((err: unknown) => {
        this.logger.warn(`Backfill skipped activity ${externalId}: ${String(err)}`);
      });

      processed++;
      effortCount += normalized.length;
    }

    this.logger.log(`Backfill for user ${userId}: ${processed} activities, ${effortCount} efforts`);
    return { processed, efforts: effortCount };
  }
}
