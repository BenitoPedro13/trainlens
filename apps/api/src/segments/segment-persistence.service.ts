import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { NormalizedSegmentEffort } from '../strava/strava.normalizer';

@Injectable()
export class SegmentPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async upsertEfforts(userId: string, efforts: NormalizedSegmentEffort[]): Promise<void> {
    for (const effort of efforts) {
      const { segment: seg, ...effortData } = effort;

      const segment = await this.db.client.segment.upsert({
        where: { externalId: seg.externalId },
        update: {
          name: seg.name,
          ...(seg.averageGrade != null && { averageGrade: seg.averageGrade }),
          ...(seg.maximumGrade != null && { maximumGrade: seg.maximumGrade }),
          ...(seg.elevationHigh != null && { elevationHigh: seg.elevationHigh }),
          ...(seg.elevationLow != null && { elevationLow: seg.elevationLow }),
          ...(seg.startLatitude != null && { startLatitude: seg.startLatitude }),
          ...(seg.startLongitude != null && { startLongitude: seg.startLongitude }),
          ...(seg.endLatitude != null && { endLatitude: seg.endLatitude }),
          ...(seg.endLongitude != null && { endLongitude: seg.endLongitude }),
          ...(seg.city && { city: seg.city }),
          ...(seg.country && { country: seg.country }),
          ...(seg.polyline && { polyline: seg.polyline }),
        },
        create: {
          externalId: seg.externalId,
          provider: 'strava',
          name: seg.name,
          activityType: seg.activityType,
          distanceMeters: seg.distanceMeters,
          ...(seg.averageGrade != null && { averageGrade: seg.averageGrade }),
          ...(seg.maximumGrade != null && { maximumGrade: seg.maximumGrade }),
          ...(seg.elevationHigh != null && { elevationHigh: seg.elevationHigh }),
          ...(seg.elevationLow != null && { elevationLow: seg.elevationLow }),
          ...(seg.startLatitude != null && { startLatitude: seg.startLatitude }),
          ...(seg.startLongitude != null && { startLongitude: seg.startLongitude }),
          ...(seg.endLatitude != null && { endLatitude: seg.endLatitude }),
          ...(seg.endLongitude != null && { endLongitude: seg.endLongitude }),
          ...(seg.climbCategory != null && { climbCategory: seg.climbCategory }),
          ...(seg.city && { city: seg.city }),
          ...(seg.country && { country: seg.country }),
          ...(seg.polyline && { polyline: seg.polyline }),
        },
      });

      await this.db.client.segmentEffort.upsert({
        where: { externalEffortId: effortData.externalEffortId },
        update: {
          elapsedSeconds: effortData.elapsedSeconds,
          ...(effortData.movingSeconds != null && { movingSeconds: effortData.movingSeconds }),
          ...(effortData.averageWatts != null && { averageWatts: effortData.averageWatts }),
          ...(effortData.averageHeartRate != null && { averageHeartRate: effortData.averageHeartRate }),
          ...(effortData.maxHeartRate != null && { maxHeartRate: effortData.maxHeartRate }),
          ...(effortData.prRank != null && { prRank: effortData.prRank }),
        },
        create: {
          userId,
          segmentId: segment.id,
          activityExternalId: effortData.activityExternalId,
          externalEffortId: effortData.externalEffortId,
          elapsedSeconds: effortData.elapsedSeconds,
          startDate: effortData.startDate,
          ...(effortData.movingSeconds != null && { movingSeconds: effortData.movingSeconds }),
          ...(effortData.averageWatts != null && { averageWatts: effortData.averageWatts }),
          ...(effortData.averageHeartRate != null && { averageHeartRate: effortData.averageHeartRate }),
          ...(effortData.maxHeartRate != null && { maxHeartRate: effortData.maxHeartRate }),
          ...(effortData.prRank != null && { prRank: effortData.prRank }),
        },
      });
    }
  }
}
