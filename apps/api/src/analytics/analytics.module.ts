import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DailyMetricsService } from './daily-metrics.service';
import { TssService } from './tss.service';
import { AnalyticsRecalcService } from './analytics-recalc.service';
import { AnalyticsRecalcProcessor } from './processors/analytics-recalc.processor';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    DailyMetricsService,
    TssService,
    AnalyticsRecalcService,
    AnalyticsRecalcProcessor,
  ],
  exports: [DailyMetricsService, AnalyticsRecalcService, TssService],
})
export class AnalyticsModule {}
