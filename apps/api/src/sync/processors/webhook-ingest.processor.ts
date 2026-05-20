import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES, type WebhookIngestJobData } from '../../queue/queue.constants';
import { DatabaseService } from '../../database/database.service';
import { SyncService } from '../sync.service';
import {
  mapAspectToAction,
  type StravaWebhookEvent,
} from '../../webhooks/strava-webhook.types';
import { captureWorkerError } from '../../common/sentry.util';

@Processor(QUEUE_NAMES.WEBHOOK_INGEST, { concurrency: 5 })
export class WebhookIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookIngestProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly sync: SyncService,
  ) {
    super();
  }

  async process(job: Job<WebhookIngestJobData>): Promise<void> {
    const { webhookEventId } = job.data;

    const event = await this.db.client.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });
    if (!event || event.status !== 'pending') return;

    await this.db.client.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    const payload = event.payload as unknown as StravaWebhookEvent;
    const userId = event.userId;

    if (!userId) {
      await this.markSkipped(webhookEventId, 'Missing userId');
      return;
    }

    try {
      if (payload.object_type === 'athlete') {
        await this.handleAthleteEvent(userId, payload, webhookEventId);
        return;
      }

      if (payload.object_type === 'activity') {
        await this.sync.enqueueActivitySync({
          userId,
          stravaActivityId: payload.object_id,
          action: mapAspectToAction(payload.aspect_type),
          webhookEventId,
        });
        this.logger.log(
          `Routed activity ${payload.object_id} (${payload.aspect_type}) for user ${userId}`,
        );
        return;
      }

      await this.markSkipped(webhookEventId, `Unknown object_type: ${payload.object_type}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      captureWorkerError(err, {
        queue: QUEUE_NAMES.WEBHOOK_INGEST,
        jobId: job.id,
        jobName: job.name,
        data: job.data,
      });
      await this.db.client.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'failed', errorMessage: message },
      });
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WebhookIngestJobData>, error: Error): void {
    captureWorkerError(error, {
      queue: QUEUE_NAMES.WEBHOOK_INGEST,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  }

  private async handleAthleteEvent(
    userId: string,
    payload: StravaWebhookEvent,
    webhookEventId: string,
  ): Promise<void> {
    const authorized = payload.updates?.['authorized'];
    if (payload.aspect_type === 'update' && authorized === 'false') {
      await this.db.client.connection
        .delete({
          where: { userId_provider: { userId, provider: 'strava' } },
        })
        .catch(() => {
          /* connection may already be removed */
        });
      this.logger.log(`Strava connection removed for user ${userId} (deauthorize)`);
    }

    await this.db.client.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'completed', processedAt: new Date() },
    });
  }

  private async markSkipped(webhookEventId: string, reason: string): Promise<void> {
    await this.db.client.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'skipped',
        errorMessage: reason,
        processedAt: new Date(),
      },
    });
  }
}
