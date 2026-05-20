import { Injectable } from '@nestjs/common';
import type { Activity } from '@trainlens/shared';
import type { ActivityType, Prisma } from '@trainlens/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActivityPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async upsertMany(connectionId: string, activities: Activity[]): Promise<number> {
    let count = 0;
    for (const activity of activities) {
      await this.upsert(connectionId, activity);
      count++;
    }
    return count;
  }

  async upsert(connectionId: string, activity: Activity): Promise<void> {
    await this.upsertOne(connectionId, activity);
  }

  async softDeleteByExternalId(userId: string, externalId: string): Promise<void> {
    await this.db.client.activity.updateMany({
      where: { userId, provider: 'strava', externalId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async upsertOne(connectionId: string, activity: Activity): Promise<void> {
    const data = this.toPrismaFields(connectionId, activity);

    await this.db.client.activity.upsert({
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
        updatedAt: new Date(),
      },
    });
  }

  private toPrismaFields(
    connectionId: string,
    activity: Activity,
  ): Prisma.ActivityUncheckedCreateInput {
    return {
      userId: activity.userId,
      connectionId,
      externalId: activity.externalId,
      provider: 'strava',
      name: activity.name,
      description: activity.description ?? null,
      activityType: activity.activityType as ActivityType,
      startedAt: activity.startedAt,
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
    };
  }
}
