import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type { AnalyticsSummaryResponse } from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { DailyMetricsService } from './daily-metrics.service';

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

    const activityCount = await this.db.client.activity.count({
      where: { userId, deletedAt: null },
    });
    const metricsCount = await this.db.client.dailyMetrics.count({ where: { userId } });
    if (activityCount > 0 && metricsCount === 0) {
      await this.dailyMetrics.recalculateForUser(userId);
    }

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
    };

    await this.cache.set(cacheKey, response, CACHE_TTL_SECONDS);
    return response;
  }

  private cacheKey(userId: string, from: Date, to: Date): string {
    const hash = createHash('sha256')
      .update(`${from.toISOString()}|${to.toISOString()}`)
      .digest('hex')
      .slice(0, 16);
    return `analytics:${userId}:${hash}`;
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
