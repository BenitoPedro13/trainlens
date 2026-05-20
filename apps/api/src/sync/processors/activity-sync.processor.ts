import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Activity, ProviderTokens } from '@trainlens/shared';
import { QUEUE_NAMES, type ActivitySyncJobData } from '../../queue/queue.constants';
import { StravaAdapter, StravaUnauthorizedError } from '../../strava/strava.adapter';
import { ConnectionTokensService } from '../connection-tokens.service';
import { ActivityPersistenceService } from '../activity-persistence.service';
import { DatabaseService } from '../../database/database.service';
import { captureWorkerError } from '../../common/sentry.util';

@Processor(QUEUE_NAMES.ACTIVITY_SYNC, { concurrency: 3 })
export class ActivitySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ActivitySyncProcessor.name);

  constructor(
    private readonly strava: StravaAdapter,
    private readonly tokens: ConnectionTokensService,
    private readonly activities: ActivityPersistenceService,
    private readonly db: DatabaseService,
  ) {
    super();
  }

  async process(job: Job<ActivitySyncJobData>): Promise<void> {
    const { userId, stravaActivityId, action, webhookEventId } = job.data;
    this.logger.log(`Activity sync ${action} id=${stravaActivityId} user=${userId}`);

    if (action === 'delete') {
      await this.activities.softDeleteByExternalId(userId, String(stravaActivityId));
      await this.finishWebhook(webhookEventId, userId);
      return;
    }

    const connection = await this.tokens.getStravaTokens(userId);
    if (!connection) {
      throw new Error(`No Strava connection for user ${userId}`);
    }

    let providerTokens: ProviderTokens = {
      accessToken: connection.accessToken,
      ...(connection.refreshToken && { refreshToken: connection.refreshToken }),
      ...(connection.expiresAt && { expiresAt: connection.expiresAt }),
    };

    const externalId = String(stravaActivityId);
    let detail: { activity: Activity; rawPayload: Record<string, unknown> };

    try {
      detail = await this.strava.getActivityDetailWithRaw(providerTokens, externalId);
    } catch (err) {
      if (err instanceof StravaUnauthorizedError && connection.refreshToken) {
        providerTokens = await this.strava.refreshTokens(providerTokens);
        await this.tokens.updateStravaTokens(userId, providerTokens);
        detail = await this.strava.getActivityDetailWithRaw(providerTokens, externalId);
      } else {
        throw err;
      }
    }

    const activityId = await this.activities.upsert(connection.connectionId, {
      ...detail.activity,
      userId,
    });
    await this.activities.saveRawPayload(activityId, detail.rawPayload);
    await this.finishWebhook(webhookEventId, userId);
  }

  private async finishWebhook(webhookEventId: string, userId: string): Promise<void> {
    await this.db.client.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'completed', processedAt: new Date(), errorMessage: null },
    });

    await this.db.client.connection.update({
      where: { userId_provider: { userId, provider: 'strava' } },
      data: { lastSyncedAt: new Date(), status: 'active', syncErrorMessage: null },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ActivitySyncJobData>, error: Error): void {
    this.logger.error(`Activity sync failed: ${error.message}`);
    captureWorkerError(error, {
      queue: QUEUE_NAMES.ACTIVITY_SYNC,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
    void this.db.client.webhookEvent.update({
      where: { id: job.data.webhookEventId },
      data: { status: 'failed', errorMessage: error.message },
    });
    void this.tokens.markSyncError(job.data.userId, error.message);
  }
}
