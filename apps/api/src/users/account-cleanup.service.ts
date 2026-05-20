import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class AccountCleanupService {
  private readonly logger = new Logger(AccountCleanupService.name);

  constructor(private readonly users: UsersService) {}

  /** Hard-delete accounts soft-deleted more than 30 days ago (Sprint 6.5). */
  @Cron('0 3 * * *')
  async handleScheduledPurge(): Promise<void> {
    const count = await this.users.purgeDeletedAccounts();
    if (count > 0) {
      this.logger.log(`Purged ${count} deleted account(s)`);
    }
  }
}
