import { Injectable, Logger } from '@nestjs/common';
import type { ActivityType } from '@trainlens/database';
import { computeTrainingLoadSeries, fillDailyTssTimeline } from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { TssService } from './tss.service';
import { resolveActivityLocalDateKey } from './activity-local-date.util.js';
import { aggregateActivitiesByDay, computeStreaks as computeStreaksUtil } from './daily-metrics.utils.js';

@Injectable()
export class DailyMetricsService {
  private readonly logger = new Logger(DailyMetricsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
    private readonly tss: TssService,
  ) {}

  async recalculateForUser(userId: string, _fromDate?: Date): Promise<void> {
    await this.tss.backfillForUser(userId, { force: true });

    const rows = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        startedAt: true,
        timezone: true,
        distanceMeters: true,
        durationSeconds: true,
        elevationGainMeters: true,
        calories: true,
        tss: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    const needsRaw = rows.filter((r) => !r.timezone).map((r) => r.id);
    const rawByActivityId = new Map<string, unknown>();
    if (needsRaw.length > 0) {
      const raws = await this.db.client.activityRawPayload.findMany({
        where: { activityId: { in: needsRaw } },
        select: { activityId: true, payload: true },
      });
      for (const r of raws) rawByActivityId.set(r.activityId, r.payload);
    }

    const activities = rows.map((r) => ({
      startedAt: r.startedAt,
      timezone: r.timezone,
      localDateKey: resolveActivityLocalDateKey(
        r.startedAt,
        r.timezone,
        rawByActivityId.get(r.id),
      ),
      distanceMeters: r.distanceMeters,
      durationSeconds: r.durationSeconds,
      elevationGainMeters: r.elevationGainMeters,
      calories: r.calories,
      tss: r.tss,
    }));

    if (!activities.length) {
      await this.cache.deleteByPrefix(`analytics:${userId}:`);
      return;
    }

    const byDate = aggregateActivitiesByDay(activities);
    const firstKey = activities[0]!.startedAt.toISOString().slice(0, 10);
    const todayKey = new Date().toISOString().slice(0, 10);
    const tssByDate = new Map([...byDate.entries()].map(([k, v]) => [k, v.tss]));
    const loadSeries = computeTrainingLoadSeries(fillDailyTssTimeline(tssByDate, firstKey, todayKey));
    const loadByDate = new Map(loadSeries.map((p) => [p.date, p]));

    for (const [dateKey, agg] of byDate) {
      const date = new Date(`${dateKey}T00:00:00.000Z`);
      const load = loadByDate.get(dateKey);
      await this.db.client.dailyMetrics.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          totalActivities: agg.totalActivities,
          totalDistanceMeters: agg.totalDistanceMeters,
          totalDurationSeconds: agg.totalDurationSeconds,
          totalElevationGainMeters: agg.totalElevationGainMeters,
          totalCalories: agg.totalCalories,
          tss: agg.tss,
          ctl: load?.ctl ?? 0,
          atl: load?.atl ?? 0,
          tsb: load?.tsb ?? 0,
        },
        update: {
          totalActivities: agg.totalActivities,
          totalDistanceMeters: agg.totalDistanceMeters,
          totalDurationSeconds: agg.totalDurationSeconds,
          totalElevationGainMeters: agg.totalElevationGainMeters,
          totalCalories: agg.totalCalories,
          tss: agg.tss,
          ctl: load?.ctl ?? 0,
          atl: load?.atl ?? 0,
          tsb: load?.tsb ?? 0,
        },
      });
    }

    // Persist CTL/ATL/TSB on rest days (zero TSS) so training-load charts stay continuous.
    for (const point of loadSeries) {
      if (byDate.has(point.date)) continue;
      const date = new Date(`${point.date}T00:00:00.000Z`);
      await this.db.client.dailyMetrics.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          totalActivities: 0,
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          totalElevationGainMeters: 0,
          totalCalories: 0,
          tss: 0,
          ctl: point.ctl,
          atl: point.atl,
          tsb: point.tsb,
        },
        update: {
          ctl: point.ctl,
          atl: point.atl,
          tsb: point.tsb,
        },
      });
    }

    await this.cache.deleteByPrefix(`analytics:${userId}:`);
    this.logger.debug(`DailyMetrics recalculated for user ${userId} (${byDate.size} active days)`);
  }

  async getActiveDates(userId: string, from: Date, to: Date): Promise<Date[]> {
    const rows = await this.db.client.dailyMetrics.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
        totalActivities: { gt: 0 },
      },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => r.date);
  }

  computeStreaks(activeDates: Date[]): { current: number; longest: number } {
    return computeStreaksUtil(activeDates);
  }

  async getHeatmapData(
    userId: string,
    year: number,
  ): Promise<Array<{ date: string; count: number; distanceMeters: number }>> {
    // Wider UTC window so edge-of-year activities are included before local-date filter.
    const queryFrom = new Date(`${year - 1}-12-01T00:00:00.000Z`);
    const queryTo = new Date(`${year + 1}-01-15T23:59:59.999Z`);

    const rows = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: queryFrom, lte: queryTo },
      },
      select: { id: true, startedAt: true, timezone: true, distanceMeters: true },
    });

    const needsRaw = rows.filter((r) => !r.timezone).map((r) => r.id);
    const rawByActivityId = new Map<string, unknown>();
    if (needsRaw.length > 0) {
      const raws = await this.db.client.activityRawPayload.findMany({
        where: { activityId: { in: needsRaw } },
        select: { activityId: true, payload: true },
      });
      for (const r of raws) rawByActivityId.set(r.activityId, r.payload);
    }

    const byDate = new Map<string, { count: number; distanceMeters: number }>();
    const yearPrefix = `${year}-`;

    for (const a of rows) {
      const dateKey = resolveActivityLocalDateKey(
        a.startedAt,
        a.timezone,
        rawByActivityId.get(a.id),
      );
      if (!dateKey.startsWith(yearPrefix)) continue;

      const cell = byDate.get(dateKey) ?? { count: 0, distanceMeters: 0 };
      cell.count += 1;
      cell.distanceMeters += a.distanceMeters ?? 0;
      byDate.set(dateKey, cell);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        count: v.count,
        distanceMeters: v.distanceMeters,
      }));
  }

  async sportDistribution(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ activityType: ActivityType; count: number; distanceMeters: number }>> {
    const groups = await this.db.client.activity.groupBy({
      by: ['activityType'],
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: from, lte: to },
      },
      _count: { _all: true },
      _sum: { distanceMeters: true },
    });

    return groups.map((g) => ({
      activityType: g.activityType,
      count: g._count._all,
      distanceMeters: g._sum.distanceMeters ?? 0,
    }));
  }
}
