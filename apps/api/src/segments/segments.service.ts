import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SegmentListItem {
  id: string;
  externalId: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  averageGrade: number | null;
  climbCategory: number | null;
  city: string | null;
  country: string | null;
  prElapsedSeconds: number | null;
  prDate: string | null;
  effortCount: number;
}

export interface SegmentEffortItem {
  id: string;
  elapsedSeconds: number;
  movingSeconds: number | null;
  startDate: string;
  averageWatts: number | null;
  averageHeartRate: number | null;
  prRank: number | null;
}

export interface SegmentDetail {
  id: string;
  externalId: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  averageGrade: number | null;
  maximumGrade: number | null;
  elevationHigh: number | null;
  elevationLow: number | null;
  climbCategory: number | null;
  city: string | null;
  country: string | null;
  efforts: SegmentEffortItem[];
}

@Injectable()
export class SegmentsService {
  constructor(private readonly db: DatabaseService) {}

  async listUserSegments(userId: string): Promise<SegmentListItem[]> {
    const efforts = await this.db.client.segmentEffort.findMany({
      where: { userId },
      include: { segment: true },
      orderBy: { startDate: 'desc' },
    });

    const segmentMap = new Map<string, {
      segment: (typeof efforts)[0]['segment'];
      efforts: (typeof efforts)[0][];
    }>();

    for (const effort of efforts) {
      const entry = segmentMap.get(effort.segmentId) ?? { segment: effort.segment, efforts: [] };
      entry.efforts.push(effort);
      segmentMap.set(effort.segmentId, entry);
    }

    return Array.from(segmentMap.values()).map(({ segment, efforts: segEfforts }) => {
      const pr = segEfforts.reduce<(typeof segEfforts)[0] | null>((best, e) =>
        !best || e.elapsedSeconds < best.elapsedSeconds ? e : best, null);
      return {
        id: segment.id,
        externalId: segment.externalId,
        name: segment.name,
        activityType: segment.activityType,
        distanceMeters: segment.distanceMeters,
        averageGrade: segment.averageGrade,
        climbCategory: segment.climbCategory,
        city: segment.city,
        country: segment.country,
        prElapsedSeconds: pr?.elapsedSeconds ?? null,
        prDate: pr?.startDate.toISOString() ?? null,
        effortCount: segEfforts.length,
      };
    });
  }

  async getSegmentDetail(userId: string, segmentId: string): Promise<SegmentDetail> {
    const segment = await this.db.client.segment.findUnique({
      where: { id: segmentId },
      include: {
        efforts: {
          where: { userId },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!segment) throw new NotFoundException('Segment not found');

    const hasEffort = segment.efforts.some((e) => e.userId === userId);
    if (!hasEffort && segment.efforts.length === 0) {
      throw new NotFoundException('Segment not found');
    }

    return {
      id: segment.id,
      externalId: segment.externalId,
      name: segment.name,
      activityType: segment.activityType,
      distanceMeters: segment.distanceMeters,
      averageGrade: segment.averageGrade,
      maximumGrade: segment.maximumGrade,
      elevationHigh: segment.elevationHigh,
      elevationLow: segment.elevationLow,
      climbCategory: segment.climbCategory,
      city: segment.city,
      country: segment.country,
      efforts: segment.efforts.map((e) => ({
        id: e.id,
        elapsedSeconds: e.elapsedSeconds,
        movingSeconds: e.movingSeconds,
        startDate: e.startDate.toISOString(),
        averageWatts: e.averageWatts,
        averageHeartRate: e.averageHeartRate,
        prRank: e.prRank,
      })),
    };
  }
}
