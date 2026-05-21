import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type {
  AnalyticsSummaryResponse,
  BestEffortProgressionResponse,
  BestEffortsResponse,
  HeartRateZone,
  PaceHistogramResponse,
  TrainingLoadResponse,
  YearOverYearResponse,
  ZonesResponse,
} from '@trainlens/shared';
import {
  computeAcuteChronicRatio,
  computeHeartRateZones,
  computeHeartRateZonesFromStream,
  computeMonotony,
  computePaceZones,
  computeYearOverYear,
  extractBestEffortProgression,
  extractBestEfforts,
} from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { DailyMetricsService } from './daily-metrics.service';
import { extractHeartrateStream } from './streams.util';
import { toBestEffortCandidates } from './best-effort-candidates.util';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
    private readonly dailyMetrics: DailyMetricsService,
  ) {}

  async getSummary(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<AnalyticsSummaryResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 84 * 86_400_000);

    const cacheKey = this.cacheKey(userId, fromDate, toDate);
    const cached = await this.cache.get<AnalyticsSummaryResponse>(cacheKey);
    if (cached) return cached;

    await this.ensureMetrics(userId);

    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: fromDate, lte: toDate },
      },
      select: {
        startedAt: true,
        distanceMeters: true,
        durationSeconds: true,
        elevationGainMeters: true,
      },
    });

    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let totalElevationGainMeters = 0;

    const weekMap = new Map<string, { distanceMeters: number; activityCount: number }>();

    for (const a of activities) {
      totalDistanceMeters += a.distanceMeters ?? 0;
      totalDurationSeconds += a.durationSeconds;
      totalElevationGainMeters += a.elevationGainMeters ?? 0;

      const weekStart = startOfWeek(a.startedAt);
      const key = weekStart.toISOString().slice(0, 10);
      const w = weekMap.get(key) ?? { distanceMeters: 0, activityCount: 0 };
      w.distanceMeters += a.distanceMeters ?? 0;
      w.activityCount += 1;
      weekMap.set(key, w);
    }

    const activeDates = await this.dailyMetrics.getActiveDates(userId, fromDate, toDate);
    const streaks = this.dailyMetrics.computeStreaks(activeDates);

    const weekAgo = new Date(toDate.getTime() - 7 * 86_400_000);
    const lastWeek = activities.filter((a) => a.startedAt >= weekAgo);

    const sportGroups = await this.dailyMetrics.sportDistribution(userId, fromDate, toDate);

    const weekAgoMetrics = new Date(toDate.getTime() - 7 * 86_400_000);
    const recentMetrics = await this.db.client.dailyMetrics.findMany({
      where: { userId, date: { gte: weekAgoMetrics, lte: toDate } },
      orderBy: { date: 'asc' },
      select: { date: true, tss: true, ctl: true, atl: true },
    });
    const monotony = computeMonotony(recentMetrics.map((m) => m.tss));
    const latestLoad = [...recentMetrics].reverse().find((m) => m.ctl != null && m.atl != null);
    const acuteChronicRatio = computeAcuteChronicRatio(
      latestLoad?.atl ?? 0,
      latestLoad?.ctl ?? 0,
    );

    const response: AnalyticsSummaryResponse = {
      totalActivities: activities.length,
      totalDistanceMeters,
      totalDurationSeconds,
      totalElevationGainMeters,
      currentStreakDays: streaks.current,
      longestStreakDays: streaks.longest,
      weeklyDistanceMeters: lastWeek.reduce((s, a) => s + (a.distanceMeters ?? 0), 0),
      weeklyActivities: lastWeek.length,
      weeklyVolume: [...weekMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, v]) => ({
          weekStart,
          distanceMeters: v.distanceMeters,
          activityCount: v.activityCount,
        })),
      sportDistribution: sportGroups.map((g) => ({
        activityType: g.activityType,
        count: g.count,
        distanceMeters: g.distanceMeters,
      })),
      monotony,
      acuteChronicRatio,
    };

    await this.cache.set(cacheKey, response, CACHE_TTL_SECONDS);
    return response;
  }

  async getTrainingLoad(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<TrainingLoadResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 90 * 86_400_000);

    await this.ensureMetrics(userId);

    const rows = await this.db.client.dailyMetrics.findMany({
      where: { userId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'asc' },
      select: { date: true, tss: true, ctl: true, atl: true, tsb: true },
    });

    return {
      points: rows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        tss: r.tss,
        ctl: r.ctl ?? 0,
        atl: r.atl ?? 0,
        tsb: r.tsb ?? 0,
      })),
    };
  }

  async getBestEfforts(userId: string, activityType?: string): Promise<BestEffortsResponse> {
    const rows = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(activityType && { activityType: activityType as never }),
      },
      select: {
        id: true,
        name: true,
        activityType: true,
        startedAt: true,
        timezone: true,
        durationSeconds: true,
        distanceMeters: true,
      },
    });

    const candidates = await toBestEffortCandidates(this.db, rows);
    const efforts = extractBestEfforts(candidates).map((e) => ({
      distanceMeters: e.distanceMeters,
      label: e.label,
      durationSeconds: e.durationSeconds,
      achievedAt: e.achievedAt.toISOString(),
      achievedOnLocal: e.achievedOnLocal,
      activityId: e.activityId,
      isEstimated: e.isEstimated,
      ...(e.activityName ? { activityName: e.activityName } : {}),
    }));

    return { efforts };
  }

  async getBestEffortProgression(
    userId: string,
    activityType?: string,
    from?: string,
    to?: string,
  ): Promise<BestEffortProgressionResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 730 * 86_400_000);

    const rows = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: fromDate, lte: toDate },
        ...(activityType && { activityType: activityType as never }),
      },
      select: {
        id: true,
        name: true,
        activityType: true,
        startedAt: true,
        timezone: true,
        durationSeconds: true,
        distanceMeters: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    const candidates = await toBestEffortCandidates(this.db, rows);
    const series = extractBestEffortProgression(candidates).map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        label: p.label,
        distanceMeters: p.distanceMeters,
        achievedAt: p.achievedAt.toISOString(),
        achievedOnLocal: p.achievedOnLocal,
        durationSeconds: p.durationSeconds,
        activityId: p.activityId,
        isEstimated: p.isEstimated,
      })),
    }));

    return { series };
  }

  async getZones(
    userId: string,
    from?: string,
    to?: string,
    activityType?: string,
  ): Promise<ZonesResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 84 * 86_400_000);

    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: { maxHeartRate: true },
    });
    const maxHrEstimate = user?.maxHeartRate ?? 190;

    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: fromDate, lte: toDate },
        ...(activityType && { activityType: activityType as never }),
      },
      select: {
        id: true,
        durationSeconds: true,
        averageHeartRate: true,
        maxHeartRate: true,
        averagePaceSecondsPerKm: true,
        activityType: true,
      },
    });

    const raws = await this.db.client.activityRawPayload.findMany({
      where: { activityId: { in: activities.map((a) => a.id) } },
      select: { activityId: true, payload: true },
    });
    const rawById = new Map(raws.map((r) => [r.activityId, r.payload]));

    const streamZoneSeconds = new Map<1 | 2 | 3 | 4 | 5, number>();
    let streamTotal = 0;

    for (const a of activities) {
      const stream = extractHeartrateStream(rawById.get(a.id));
      if (!stream) continue;

      const zones = computeHeartRateZonesFromStream(
        stream.heartrate,
        stream.timeSeconds,
        maxHrEstimate,
      );
      for (const z of zones) {
        streamZoneSeconds.set(z.zone, (streamZoneSeconds.get(z.zone) ?? 0) + z.durationSeconds);
        streamTotal += z.durationSeconds;
      }
    }

    let heartRate: HeartRateZone[];
    if (streamTotal > 0) {
      const template = computeHeartRateZonesFromStream(
        [Math.round(maxHrEstimate * 0.75)],
        undefined,
        maxHrEstimate,
      );
      heartRate = template.map((z) => {
        const durationSeconds = streamZoneSeconds.get(z.zone) ?? 0;
        return {
          ...z,
          durationSeconds,
          percentOfTotal: round1((durationSeconds / streamTotal) * 100),
        };
      });
    } else {
      heartRate = computeHeartRateZones(activities, maxHrEstimate);
    }

    return {
      heartRate,
      pace: computePaceZones(activities),
    };
  }

  async getYearOverYear(
    userId: string,
    mode: 'week' | 'month' = 'week',
    from?: string,
    to?: string,
  ): Promise<YearOverYearResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 730 * 86_400_000);

    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: fromDate, lte: toDate },
      },
      select: {
        startedAt: true,
        distanceMeters: true,
        tss: true,
      },
    });

    return {
      mode,
      points: computeYearOverYear(activities, mode),
    };
  }

  async getPaceHistogram(
    userId: string,
    from?: string,
    to?: string,
    activityType?: string,
  ): Promise<PaceHistogramResponse> {
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(toDate.getTime() - 365 * 86_400_000);

    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: fromDate, lte: toDate },
        averagePaceSecondsPerKm: { not: null },
        ...(activityType ? { activityType: activityType as never } : {}),
      },
      select: {
        averagePaceSecondsPerKm: true,
        durationSeconds: true,
        distanceMeters: true,
      },
    });

    const BINS: Array<{ label: string; min: number; max: number }> = [
      { label: '<3:30/km', min: 0, max: 210 },
      { label: '3:30–4:00', min: 210, max: 240 },
      { label: '4:00–4:30', min: 240, max: 270 },
      { label: '4:30–5:00', min: 270, max: 300 },
      { label: '5:00–5:30', min: 300, max: 330 },
      { label: '5:30–6:00', min: 330, max: 360 },
      { label: '6:00–7:00', min: 360, max: 420 },
      { label: '7:00–8:00', min: 420, max: 480 },
      { label: '8:00–10:00', min: 480, max: 600 },
      { label: '>10:00/km', min: 600, max: Infinity },
    ];

    const bins = BINS.map((b) => ({
      label: b.label,
      minSecondsPerKm: b.min,
      maxSecondsPerKm: b.max === Infinity ? 99999 : b.max,
      count: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
    }));

    for (const a of activities) {
      const pace = a.averagePaceSecondsPerKm!;
      const binIdx = BINS.findIndex((b) => pace >= b.min && pace < b.max);
      const bin = bins[binIdx];
      if (binIdx !== -1 && bin) {
        bin.count++;
        bin.totalDurationSeconds += a.durationSeconds;
        bin.totalDistanceMeters += a.distanceMeters ?? 0;
      }
    }

    return { bins: bins.filter((b) => b.count > 0 || false), activityCount: activities.length };
  }

  private async ensureMetrics(userId: string): Promise<void> {
    const activityCount = await this.db.client.activity.count({
      where: { userId, deletedAt: null },
    });
    const metricsCount = await this.db.client.dailyMetrics.count({ where: { userId } });
    if (activityCount > 0 && metricsCount === 0) {
      await this.dailyMetrics.recalculateForUser(userId);
    }
  }

  private cacheKey(userId: string, from: Date, to: Date): string {
    const hash = createHash('sha256')
      .update(`${from.toISOString()}|${to.toISOString()}`)
      .digest('hex')
      .slice(0, 16);
    return `analytics:${userId}:${hash}`;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
