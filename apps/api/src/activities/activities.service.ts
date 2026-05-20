import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityType } from '@trainlens/database';
import type {
  ActivityDetailResponse,
  ActivityListItem,
  PaginatedActivitiesResponse,
} from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';
import { extractLapsFromRawPayload } from './laps.util';

export interface ListActivitiesParams {
  page: number;
  limit: number;
  activityType?: ActivityType;
  from?: string;
  to?: string;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly db: DatabaseService) {}

  async list(userId: string, params: ListActivitiesParams): Promise<PaginatedActivitiesResponse> {
    const { page, limit, activityType, from, to } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      deletedAt: null,
      ...(activityType && { activityType }),
      ...(from || to
        ? {
            startedAt: {
              ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
              ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.client.activity.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalId: true,
          name: true,
          activityType: true,
          startedAt: true,
          durationSeconds: true,
          distanceMeters: true,
          elevationGainMeters: true,
        },
      }),
      this.db.client.activity.count({ where }),
    ]);

    return {
      items: items.map((a) => this.toListItem(a)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getById(
    userId: string,
    id: string,
    includeRaw = false,
  ): Promise<ActivityDetailResponse> {
    const activity = await this.db.client.activity.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const base = this.toListItem(activity);
    const result: ActivityDetailResponse = {
      ...base,
      description: activity.description,
      averageHeartRate: activity.averageHeartRate,
      maxHeartRate: activity.maxHeartRate,
      averagePaceSecondsPerKm: activity.averagePaceSecondsPerKm,
      averagePowerWatts: activity.averagePowerWatts,
      calories: activity.calories,
      summaryPolyline: activity.summaryPolyline,
      deviceName: activity.deviceName,
      manual: activity.manual,
    };

    const raw = await this.db.client.activityRawPayload.findUnique({
      where: { activityId: id },
    });
    if (raw) {
      const laps = extractLapsFromRawPayload(raw.payload);
      if (laps?.length) result.laps = laps;
      if (includeRaw) result.rawPayload = raw.payload;
    }

    return result;
  }

  private toListItem(a: {
    id: string;
    externalId: string;
    name: string;
    activityType: ActivityType;
    startedAt: Date;
    durationSeconds: number;
    distanceMeters: number | null;
    elevationGainMeters: number | null;
  }): ActivityListItem {
    return {
      id: a.id,
      externalId: a.externalId,
      name: a.name,
      activityType: a.activityType,
      startedAt: a.startedAt.toISOString(),
      durationSeconds: a.durationSeconds,
      distanceMeters: a.distanceMeters,
      elevationGainMeters: a.elevationGainMeters,
    };
  }
}
