import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { decryptToken } from '@trainlens/shared';
import { QUEUE_NAMES, type SegmentMetadataSyncJobData } from '../queue/queue.constants';
import { StravaAdapter } from '../strava/strava.adapter';
import { DatabaseService } from '../database/database.service';
import { captureWorkerError } from '../common/sentry.util';

@Processor(QUEUE_NAMES.SEGMENT_METADATA_SYNC, { concurrency: 2 })
export class SegmentMetadataSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SegmentMetadataSyncProcessor.name);

  constructor(
    private readonly strava: StravaAdapter,
    private readonly db: DatabaseService,
  ) {
    super();
  }

  async process(job: Job<SegmentMetadataSyncJobData>): Promise<void> {
    const { segmentExternalId, userId } = job.data;
    this.logger.log(`Fetching metadata for segment ${segmentExternalId}`);

    const conn = await this.db.client.connection.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
    });
    if (!conn) throw new Error(`No Strava connection for user ${userId}`);

    const tokens = { accessToken: decryptToken(conn.encryptedAccessToken) };

    const detail = await this.strava.getSegmentById(tokens, segmentExternalId);

    await this.db.client.segment.update({
      where: { externalId: segmentExternalId },
      data: {
        name: detail.name,
        distanceMeters: detail.distance,
        averageGrade: detail.average_grade,
        maximumGrade: detail.maximum_grade,
        elevationHigh: detail.elevation_high,
        elevationLow: detail.elevation_low,
        climbCategory: detail.climb_category,
        city: detail.city ?? null,
        country: detail.country ?? null,
        ...(detail.start_latlng?.length === 2 && {
          startLatitude: detail.start_latlng[0],
          startLongitude: detail.start_latlng[1],
        }),
        ...(detail.end_latlng?.length === 2 && {
          endLatitude: detail.end_latlng[0],
          endLongitude: detail.end_latlng[1],
        }),
        ...(detail.map?.polyline && { polyline: detail.map.polyline }),
      },
    });

    this.logger.log(`Segment ${segmentExternalId} metadata updated`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SegmentMetadataSyncJobData>, error: Error): void {
    this.logger.error(`Segment metadata sync failed: ${error.message}`);
    captureWorkerError(error, {
      queue: QUEUE_NAMES.SEGMENT_METADATA_SYNC,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  }
}
