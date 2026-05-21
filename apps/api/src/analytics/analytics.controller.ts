import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type {
  AnalyticsSummaryResponse,
  BestEffortProgressionResponse,
  BestEffortsResponse,
  PaceHistogramResponse,
  TrainingLoadResponse,
  YearOverYearResponse,
  ZonesResponse,
} from '@trainlens/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { AnalyticsService } from './analytics.service';
import { DailyMetricsService } from './daily-metrics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly dailyMetrics: DailyMetricsService,
  ) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<AnalyticsSummaryResponse> {
    return this.analytics.getSummary(user.userId, from, to);
  }

  @Get('heatmap')
  getHeatmap(
    @CurrentUser() user: RequestUser,
    @Query('year') year?: string,
  ): Promise<Array<{ date: string; count: number; distanceMeters: number }>> {
    const y = year ? parseInt(year, 10) : new Date().getUTCFullYear();
    return this.dailyMetrics.getHeatmapData(user.userId, y);
  }

  @Get('training-load')
  getTrainingLoad(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TrainingLoadResponse> {
    return this.analytics.getTrainingLoad(user.userId, from, to);
  }

  @Get('best-efforts')
  getBestEfforts(
    @CurrentUser() user: RequestUser,
    @Query('activityType') activityType?: string,
  ): Promise<BestEffortsResponse> {
    return this.analytics.getBestEfforts(user.userId, activityType);
  }

  @Get('best-efforts/progression')
  getBestEffortProgression(
    @CurrentUser() user: RequestUser,
    @Query('activityType') activityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<BestEffortProgressionResponse> {
    return this.analytics.getBestEffortProgression(user.userId, activityType, from, to);
  }

  @Get('zones')
  getZones(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('activityType') activityType?: string,
  ): Promise<ZonesResponse> {
    return this.analytics.getZones(user.userId, from, to, activityType);
  }

  @Get('year-over-year')
  getYearOverYear(
    @CurrentUser() user: RequestUser,
    @Query('mode') mode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<YearOverYearResponse> {
    const m = mode === 'month' ? 'month' : 'week';
    return this.analytics.getYearOverYear(user.userId, m, from, to);
  }

  @Get('pace-histogram')
  getPaceHistogram(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('activityType') activityType?: string,
  ): Promise<PaceHistogramResponse> {
    return this.analytics.getPaceHistogram(user.userId, from, to, activityType);
  }
}
