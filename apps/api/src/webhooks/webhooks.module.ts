import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { StravaWebhookController } from './strava-webhook.controller';
import { StravaWebhookService } from './strava-webhook.service';

@Module({
  imports: [SyncModule],
  controllers: [StravaWebhookController],
  providers: [StravaWebhookService],
})
export class WebhooksModule {}
