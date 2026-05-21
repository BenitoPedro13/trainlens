import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { StravaModule } from '../strava/strava.module';
import { SyncModule } from '../sync/sync.module';
import { QueueModule } from '../queue/queue.module';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountCleanupService } from './account-cleanup.service';
import { DataExportProcessor } from './processors/data-export.processor';

@Module({
  imports: [
    AuthModule,
    CacheModule,
    StravaModule,
    SyncModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.DATA_EXPORT }),
  ],
  controllers: [UsersController],
  providers: [UsersService, AccountCleanupService, DataExportProcessor],
  exports: [UsersService],
})
export class UsersModule {}
