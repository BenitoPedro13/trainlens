import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  type ActivitySyncJobData,
  type BulkImportJobData,
  type WebhookIngestJobData,
} from '../queue/queue.constants';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BULK_IMPORT) private readonly bulkImportQueue: Queue<BulkImportJobData>,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_INGEST)
    private readonly webhookIngestQueue: Queue<WebhookIngestJobData>,
    @InjectQueue(QUEUE_NAMES.ACTIVITY_SYNC)
    private readonly activitySyncQueue: Queue<ActivitySyncJobData>,
  ) {}

  async enqueueBulkImport(
    userId: string,
    afterTimestamp?: number,
  ): Promise<{ jobId: string; alreadyQueued: boolean }> {
    const jobId = `bulk-import-${userId}`;

    const existing = await this.bulkImportQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        this.logger.debug(`Bulk import already queued for user ${userId} (${state})`);
        return { jobId, alreadyQueued: true };
      }
    }

    const jobData: BulkImportJobData =
      afterTimestamp !== undefined ? { userId, afterTimestamp } : { userId };

    const job = await this.bulkImportQueue.add('bulk-import', jobData, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Enqueued bulk import for user ${userId} (job ${job.id})`);
    return { jobId: job.id!, alreadyQueued: false };
  }

  async enqueueWebhookIngest(webhookEventId: string): Promise<void> {
    await this.webhookIngestQueue.add(
      'webhook-ingest',
      { webhookEventId },
      { jobId: `webhook-ingest-${webhookEventId}`, removeOnComplete: true },
    );
  }

  async enqueueActivitySync(data: ActivitySyncJobData): Promise<void> {
    const jobId = `activity-sync-${data.userId}-${data.stravaActivityId}-${data.action}`;
    await this.activitySyncQueue.add('activity-sync', data, {
      jobId,
      removeOnComplete: true,
    });
  }
}
