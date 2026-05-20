import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { StravaModule } from '../strava/strava.module';
import { SyncModule } from '../sync/sync.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountCleanupService } from './account-cleanup.service';

@Module({
  imports: [AuthModule, CacheModule, StravaModule, SyncModule],
  controllers: [UsersController],
  providers: [UsersService, AccountCleanupService],
  exports: [UsersService],
})
export class UsersModule {}
