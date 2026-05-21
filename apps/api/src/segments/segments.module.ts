import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StravaModule } from '../strava/strava.module';
import { QueueModule } from '../queue/queue.module';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { SegmentPersistenceService } from './segment-persistence.service';
import { SegmentBackfillService } from './segment-backfill.service';
import { SegmentMetadataSyncProcessor } from './segment-metadata-sync.processor';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    StravaModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.SEGMENT_METADATA_SYNC }),
  ],
  controllers: [SegmentsController],
  providers: [
    SegmentsService,
    SegmentPersistenceService,
    SegmentBackfillService,
    SegmentMetadataSyncProcessor,
  ],
  exports: [SegmentPersistenceService, SegmentBackfillService],
})
export class SegmentsModule {}
