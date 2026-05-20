import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, type BulkImportJobData } from '../queue/queue.constants';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BULK_IMPORT) private readonly bulkImportQueue: Queue<BulkImportJobData>,
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
      },
    );
    this.logger.log(`Enqueued bulk import for user ${userId} (job ${job.id})`);
    return { jobId: job.id!, alreadyQueued: false };
  }
}
