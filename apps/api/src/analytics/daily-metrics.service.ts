import { Injectable, Logger } from '@nestjs/common';
import type { ActivityType } from '@trainlens/database';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';

interface DayAggregate {
  totalActivities: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalElevationGainMeters: number;
  totalCalories: number;
}

@Injectable()
export class DailyMetricsService {
  private readonly logger = new Logger(DailyMetricsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
  ) {}

  async recalculateForUser(userId: string, fromDate?: Date): Promise<void> {
    const from = fromDate ?? new Date(0);

    const activities = await this.db.client.activity.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: from },
      },
      select: {
        startedAt: true,
        distanceMeters: true,
        durationSeconds: true,
        elevationGainMeters: true,
        calories: true,
      },
    });

    const byDate = new Map<string, DayAggregate>();

    for (const a of activities) {
      const dateKey = a.startedAt.toISOString().slice(0, 10);
      const agg = byDate.get(dateKey) ?? {
        totalActivities: 0,
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        totalElevationGainMeters: 0,
        totalCalories: 0,
      };
      agg.totalActivities += 1;
      agg.totalDistanceMeters += a.distanceMeters ?? 0;
      agg.totalDurationSeconds += a.durationSeconds;
      agg.totalElevationGainMeters += a.elevationGainMeters ?? 0;
      agg.totalCalories += a.calories ?? 0;
      byDate.set(dateKey, agg);
    }

    for (const [dateKey, agg] of byDate) {
      const date = new Date(`${dateKey}T00:00:00.000Z`);
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
        },
        update: {
          totalActivities: agg.totalActivities,
          totalDistanceMeters: agg.totalDistanceMeters,
          totalDurationSeconds: agg.totalDurationSeconds,
          totalElevationGainMeters: agg.totalElevationGainMeters,
          totalCalories: agg.totalCalories,
        },
      });
    }

    await this.cache.deleteByPrefix(`analytics:${userId}:`);
    this.logger.debug(`DailyMetrics recalculated for user ${userId} (${byDate.size} days)`);
  }

  /** Days with at least one activity, sorted ascending. */
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
    if (!activeDates.length) return { current: 0, longest: 0 };

    const daySet = new Set(activeDates.map((d) => d.toISOString().slice(0, 10)));
    const sorted = [...daySet].sort();

    let longest = 0;
    let run = 0;
    let prev: string | null = null;

    for (const day of sorted) {
      if (prev) {
        const prevDate = new Date(`${prev}T00:00:00.000Z`);
        const currDate = new Date(`${day}T00:00:00.000Z`);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
        if (diffDays === 1) {
          run += 1;
        } else {
          longest = Math.max(longest, run);
          run = 1;
        }
      } else {
        run = 1;
      }
      prev = day;
    }
    longest = Math.max(longest, run);

    let current = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let cursor = today.toISOString().slice(0, 10);

    while (daySet.has(cursor)) {
      current += 1;
      const d = new Date(`${cursor}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }

    return { current, longest };
  }

  async getHeatmapData(
    userId: string,
    year: number,
  ): Promise<Array<{ date: string; count: number; distanceMeters: number }>> {
    const from = new Date(`${year}-01-01T00:00:00.000Z`);
    const to = new Date(`${year}-12-31T23:59:59.999Z`);

    const rows = await this.db.client.dailyMetrics.findMany({
      where: { userId, date: { gte: from, lte: to }, totalActivities: { gt: 0 } },
      orderBy: { date: 'asc' },
    });

    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      count: r.totalActivities,
      distanceMeters: r.totalDistanceMeters,
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
