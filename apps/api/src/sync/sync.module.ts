import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { QueueModule } from '../queue/queue.module';
import { StravaModule } from '../strava/strava.module';
import { ConnectionTokensService } from './connection-tokens.service';
import { ActivityPersistenceService } from './activity-persistence.service';
import { SyncService } from './sync.service';
import { BulkImportProcessor } from './processors/bulk-import.processor';
import { WebhookIngestProcessor } from './processors/webhook-ingest.processor';
import { ActivitySyncProcessor } from './processors/activity-sync.processor';
import { SyncController, InternalSyncController } from './sync.controller';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@Module({
  imports: [QueueModule, StravaModule, AuthModule, AnalyticsModule],
  controllers: [SyncController, InternalSyncController],
  providers: [
    ConnectionTokensService,
    ActivityPersistenceService,
    SyncService,
    BulkImportProcessor,
    WebhookIngestProcessor,
    ActivitySyncProcessor,
    InternalSecretGuard,
  ],
  exports: [SyncService],
})
export class SyncModule {}
