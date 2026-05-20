import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** Authenticated user triggers a full Strava history import. */
  @Post('strava/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  triggerBulkForUser(@CurrentUser() user: RequestUser) {
    return this.sync.enqueueBulkImport(user.userId);
  }
}

@Controller('internal/sync')
export class InternalSyncController {
  constructor(private readonly sync: SyncService) {}

  /** Called by Next.js after Strava OAuth (server-to-server). */
  @Post('bulk-import')
  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  triggerBulkInternal(@Body('userId') userId: string) {
    return this.sync.enqueueBulkImport(userId);
  }
}
