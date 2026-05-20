import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Activity, GetActivitiesOptions, ProviderTokens } from '@trainlens/shared';
import { QUEUE_NAMES, type BulkImportJobData } from '../../queue/queue.constants';
import { StravaAdapter, StravaUnauthorizedError } from '../../strava/strava.adapter';
import { ConnectionTokensService } from '../connection-tokens.service';
import { ActivityPersistenceService } from '../activity-persistence.service';
import { DatabaseService } from '../../database/database.service';
import { captureWorkerError } from '../../common/sentry.util';
import { DailyMetricsService } from '../../analytics/daily-metrics.service';

@Processor(QUEUE_NAMES.BULK_IMPORT, { concurrency: 1 })
export class BulkImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkImportProcessor.name);

  constructor(
    private readonly strava: StravaAdapter,
    private readonly tokens: ConnectionTokensService,
    private readonly activities: ActivityPersistenceService,
    private readonly db: DatabaseService,
    private readonly dailyMetrics: DailyMetricsService,
  ) {
    super();
  }

  async process(job: Job<BulkImportJobData>): Promise<{ imported: number }> {
    const { userId, afterTimestamp } = job.data;
    this.logger.log(`Starting bulk import for user ${userId} (job ${job.id})`);

    const connection = await this.tokens.getStravaTokens(userId);
    if (!connection) {
      throw new Error(`No Strava connection for user ${userId}`);
    }

    const fetchOptions: GetActivitiesOptions = {};
    if (afterTimestamp) {
      fetchOptions.after = new Date(afterTimestamp * 1000);
    }

    let providerTokens: ProviderTokens = {
      accessToken: connection.accessToken,
      ...(connection.refreshToken && { refreshToken: connection.refreshToken }),
      ...(connection.expiresAt && { expiresAt: connection.expiresAt }),
    };

    let items: Array<{ activity: Activity; rawPayload: Record<string, unknown> }>;
    try {
      items = await this.fetchAllActivities(providerTokens, userId, fetchOptions);
    } catch (err) {
      if (err instanceof StravaUnauthorizedError && connection.refreshToken) {
        this.logger.warn(`Access token expired for user ${userId} — refreshing`);
        providerTokens = await this.strava.refreshTokens(providerTokens);
        await this.tokens.updateStravaTokens(userId, providerTokens);
        items = await this.fetchAllActivities(providerTokens, userId, fetchOptions);
      } else {
        throw err;
      }
    }

    const imported = await this.activities.upsertMany(connection.connectionId, items);

    await this.db.client.connection.update({
      where: { id: connection.connectionId },
      data: {
        lastSyncedAt: new Date(),
        status: 'active',
        syncErrorMessage: null,
      },
    });

    await this.dailyMetrics.recalculateForUser(userId);

    this.logger.log(`Bulk import complete for user ${userId}: ${imported} activities`);
    return { imported };
  }

  private async fetchAllActivities(
    tokens: ProviderTokens,
    userId: string,
    options: GetActivitiesOptions,
  ): Promise<Array<{ activity: Activity; rawPayload: Record<string, unknown> }>> {
    const rows = await this.strava.getActivitiesWithRaw(tokens, options);
    return rows.map(({ activity, raw }) => ({
      activity: { ...activity, userId },
      rawPayload: { summary: raw },
    }));
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<BulkImportJobData>, error: Error): void {
    this.logger.error(`Bulk import failed for user ${job.data.userId}: ${error.message}`);
    captureWorkerError(error, {
      queue: QUEUE_NAMES.BULK_IMPORT,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
    void this.tokens.markSyncError(job.data.userId, error.message);
  }
}
