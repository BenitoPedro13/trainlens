import { Injectable } from '@nestjs/common';
import {
  calculateActivityTss,
  estimateActivityPower,
  resolveAthleteThresholds,
  type Activity,
} from '@trainlens/shared';
import type { ActivityType, Prisma } from '@trainlens/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActivityPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async upsertMany(
    connectionId: string,
    items: Array<{ activity: Activity; rawPayload?: Record<string, unknown> }>,
  ): Promise<number> {
    let count = 0;
    for (const item of items) {
      const activityId = await this.upsert(connectionId, item.activity);
      if (item.rawPayload) {
        await this.saveRawPayload(activityId, item.rawPayload);
      }
      count++;
    }
    return count;
  }

  async upsert(connectionId: string, activity: Activity): Promise<string> {
    return this.upsertOne(connectionId, activity);
  }

  async saveRawPayload(activityId: string, raw: Record<string, unknown>): Promise<void> {
    await this.db.client.activityRawPayload.upsert({
      where: { activityId },
      create: {
        activityId,
        provider: 'strava',
        payload: raw as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: raw as unknown as Prisma.InputJsonValue,
        capturedAt: new Date(),
      },
    });
  }

  async softDeleteByExternalId(userId: string, externalId: string): Promise<void> {
    await this.db.client.activity.updateMany({
      where: { userId, provider: 'strava', externalId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async upsertOne(connectionId: string, activity: Activity): Promise<string> {
    const user = await this.db.client.user.findUnique({
      where: { id: activity.userId },
      select: {
        ftpWatts: true,
        maxHeartRate: true,
        weightKg: true,
        thresholdPaceSecondsPerKm: true,
      },
    });
    const thresholds = resolveAthleteThresholds(user);
    const data = this.toPrismaFields(connectionId, activity, thresholds);

    const record = await this.db.client.activity.upsert({
      where: {
        userId_provider_externalId_startedAt: {
          userId: activity.userId,
          provider: 'strava',
          externalId: activity.externalId,
          startedAt: activity.startedAt,
        },
      },
      create: data,
      update: {
        name: data.name,
        description: data.description ?? null,
        activityType: data.activityType,
        startedAt: data.startedAt,
        timezone: data.timezone ?? null,
        durationSeconds: data.durationSeconds,
        distanceMeters: data.distanceMeters ?? null,
        elevationGainMeters: data.elevationGainMeters ?? null,
        elevationLossMeters: data.elevationLossMeters ?? null,
        averageHeartRate: data.averageHeartRate ?? null,
        maxHeartRate: data.maxHeartRate ?? null,
        averagePaceSecondsPerKm: data.averagePaceSecondsPerKm ?? null,
        averagePowerWatts: data.averagePowerWatts ?? null,
        normalizedPowerWatts: data.normalizedPowerWatts ?? null,
        maxPowerWatts: data.maxPowerWatts ?? null,
        averageCadence: data.averageCadence ?? null,
        calories: data.calories ?? null,
        startLatitude: data.startLatitude ?? null,
        startLongitude: data.startLongitude ?? null,
        endLatitude: data.endLatitude ?? null,
        endLongitude: data.endLongitude ?? null,
        summaryPolyline: data.summaryPolyline ?? null,
        deviceName: data.deviceName ?? null,
        manual: data.manual ?? false,
        tss: data.tss ?? null,
        updatedAt: new Date(),
      },
    });

    return record.id;
  }

  private toPrismaFields(
    connectionId: string,
    activity: Activity,
    thresholds: ReturnType<typeof resolveAthleteThresholds>,
  ): Prisma.ActivityUncheckedCreateInput {
    const estimatedPowerWatts = estimateActivityPower({
      activityType: activity.activityType,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters ?? null,
      elevationGainMeters: activity.elevationGainMeters ?? null,
      averagePowerWatts: activity.averagePowerWatts ?? null,
      normalizedPowerWatts: activity.normalizedPowerWatts ?? null,
      weightKg: thresholds.weightKg,
    });

    const powerForTss =
      activity.normalizedPowerWatts ??
      activity.averagePowerWatts ??
      estimatedPowerWatts;

    return {
      userId: activity.userId,
      connectionId,
      externalId: activity.externalId,
      provider: 'strava',
      name: activity.name,
      description: activity.description ?? null,
      activityType: activity.activityType as ActivityType,
      startedAt: activity.startedAt,
      timezone: activity.timezone ?? null,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters ?? null,
      elevationGainMeters: activity.elevationGainMeters ?? null,
      elevationLossMeters: activity.elevationLossMeters ?? null,
      averageHeartRate: activity.averageHeartRate ?? null,
      maxHeartRate: activity.maxHeartRate ?? null,
      averagePaceSecondsPerKm: activity.averagePaceSecondsPerKm ?? null,
      averagePowerWatts: activity.averagePowerWatts ?? null,
      normalizedPowerWatts: activity.normalizedPowerWatts ?? null,
      maxPowerWatts: activity.maxPowerWatts ?? null,
      averageCadence: activity.averageCadence ?? null,
      calories: activity.calories ?? null,
      startLatitude: activity.startLocation?.latitude ?? null,
      startLongitude: activity.startLocation?.longitude ?? null,
      endLatitude: activity.endLocation?.latitude ?? null,
      endLongitude: activity.endLocation?.longitude ?? null,
      summaryPolyline: activity.summaryPolyline ?? null,
      deviceName: activity.deviceName ?? null,
      manual: activity.manual,
      estimatedPowerWatts: estimatedPowerWatts ?? null,
      tss: calculateActivityTss(
        {
          durationSeconds: activity.durationSeconds,
          activityType: activity.activityType,
          averageHeartRate: activity.averageHeartRate ?? null,
          maxHeartRate: activity.maxHeartRate ?? null,
          averagePowerWatts: powerForTss ?? null,
          normalizedPowerWatts: activity.normalizedPowerWatts ?? null,
          averagePaceSecondsPerKm: activity.averagePaceSecondsPerKm ?? null,
        },
        thresholds,
      ),
    };
  }
}
