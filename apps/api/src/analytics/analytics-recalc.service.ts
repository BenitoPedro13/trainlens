import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, type AnalyticsRecalcJobData } from '../queue/queue.constants';

@Injectable()
export class AnalyticsRecalcService {
  constructor(
    @InjectQueue(QUEUE_NAMES.ANALYTICS_RECALC)
    private readonly queue: Queue<AnalyticsRecalcJobData>,
  ) {}

  async enqueue(userId: string, fromDate?: string): Promise<void> {
    await this.queue.add(
      'recalc',
      {
        userId,
        fromDate: fromDate ?? '1970-01-01',
      },
      {
        jobId: `analytics-recalc-${userId}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
