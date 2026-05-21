import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptToken } from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';
import { StravaAdapter } from '../strava/strava.adapter';

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

export interface EffortCompareResult {
  effort1: SegmentEffortItem;
  effort2: SegmentEffortItem;
  diffSeconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  athleteName: string;
  elapsedSeconds: number;
  startDateLocal: string;
}

export interface LeaderboardResult {
  effortCount: number;
  entryCount: number;
  entries: LeaderboardEntry[];
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
  constructor(
    private readonly db: DatabaseService,
    private readonly strava: StravaAdapter,
  ) {}

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
      efforts: segment.efforts.map((e) => this.mapEffort(e)),
    };
  }

  async getSegmentLeaderboard(
    userId: string,
    segmentId: string,
    filter?: { gender?: string; ageGroup?: string; weightClass?: string },
  ): Promise<LeaderboardResult> {
    const [segment, conn] = await Promise.all([
      this.db.client.segment.findUnique({ where: { id: segmentId } }),
      this.db.client.connection.findUnique({
        where: { userId_provider: { userId, provider: 'strava' } },
      }),
    ]);

    if (!segment) throw new NotFoundException('Segment not found');
    if (!conn) throw new NotFoundException('No Strava connection');

    const tokens = { accessToken: decryptToken(conn.encryptedAccessToken) };
    const params: Record<string, string> = {};
    if (filter?.gender) params['gender'] = filter.gender;
    if (filter?.ageGroup) params['age_group'] = filter.ageGroup;
    if (filter?.weightClass) params['weight_class'] = filter.weightClass;

    const raw = await this.strava.getSegmentLeaderboard(tokens, segment.externalId, params);

    return {
      effortCount: raw.effort_count,
      entryCount: raw.entry_count,
      entries: raw.entries.map((e) => ({
        rank: e.rank,
        athleteName: e.athlete_name,
        elapsedSeconds: e.elapsed_time,
        startDateLocal: e.start_date_local,
      })),
    };
  }

  async compareEfforts(
    userId: string,
    segmentId: string,
    effortId1: string,
    effortId2: string,
  ): Promise<EffortCompareResult> {
    const [e1, e2] = await Promise.all([
      this.db.client.segmentEffort.findFirst({ where: { id: effortId1, userId, segmentId } }),
      this.db.client.segmentEffort.findFirst({ where: { id: effortId2, userId, segmentId } }),
    ]);

    if (!e1 || !e2) throw new NotFoundException('One or more efforts not found');

    return {
      effort1: this.mapEffort(e1),
      effort2: this.mapEffort(e2),
      diffSeconds: e1.elapsedSeconds - e2.elapsedSeconds,
    };
  }

  private mapEffort(e: {
    id: string;
    elapsedSeconds: number;
    movingSeconds: number | null;
    startDate: Date;
    averageWatts: number | null;
    averageHeartRate: number | null;
    prRank: number | null;
  }): SegmentEffortItem {
    return {
      id: e.id,
      elapsedSeconds: e.elapsedSeconds,
      movingSeconds: e.movingSeconds,
      startDate: e.startDate.toISOString(),
      averageWatts: e.averageWatts,
      averageHeartRate: e.averageHeartRate,
      prRank: e.prRank,
    };
  }
}
