import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES, type AnalyticsRecalcJobData } from '../../queue/queue.constants';
import { DailyMetricsService } from '../daily-metrics.service';
import { captureWorkerError } from '../../common/sentry.util';

@Processor(QUEUE_NAMES.ANALYTICS_RECALC, { concurrency: 2 })
export class AnalyticsRecalcProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsRecalcProcessor.name);

  constructor(private readonly dailyMetrics: DailyMetricsService) {
    super();
  }

  async process(job: Job<AnalyticsRecalcJobData>): Promise<void> {
    const { userId, fromDate } = job.data;
    const from = fromDate ? new Date(`${fromDate}T00:00:00.000Z`) : undefined;
    this.logger.log(`Analytics recalc for user ${userId} from ${fromDate}`);
    await this.dailyMetrics.recalculateForUser(userId, from);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AnalyticsRecalcJobData>, error: Error): void {
    captureWorkerError(error, {
      queue: QUEUE_NAMES.ANALYTICS_RECALC,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  }
}
