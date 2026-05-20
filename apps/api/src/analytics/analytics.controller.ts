import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AnalyticsSummaryResponse } from '@trainlens/shared';
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
}
