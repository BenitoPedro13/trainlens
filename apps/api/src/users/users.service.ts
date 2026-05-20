import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StravaAdapter } from '../strava/strava.adapter';
import { ConnectionTokensService } from '../sync/connection-tokens.service';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';

export interface SyncStatusResponse {
  provider: 'strava';
  status: string;
  lastSyncedAt: string | null;
  syncErrorMessage: string | null;
  connected: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokens: ConnectionTokensService,
    private readonly strava: StravaAdapter,
    private readonly cache: CacheService,
  ) {}

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const conn = await this.db.client.connection.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
    });

    if (!conn) {
      return {
        provider: 'strava',
        status: 'disconnected',
        lastSyncedAt: null,
        syncErrorMessage: null,
        connected: false,
      };
    }

    return {
      provider: 'strava',
      status: conn.status,
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
      syncErrorMessage: conn.syncErrorMessage,
      connected: conn.status === 'active',
    };
  }

  async disconnectStrava(userId: string, deleteActivities: boolean): Promise<void> {
    const tokens = await this.tokens.getStravaTokens(userId);
    if (!tokens) {
      throw new NotFoundException('Strava connection not found');
    }

    try {
      await this.strava.revokeAccess(tokens);
    } catch (err) {
      this.logger.warn(`Strava revoke failed for ${userId}: ${err}`);
    }

    if (deleteActivities) {
      const activities = await this.db.client.activity.findMany({
        where: { userId, deletedAt: null },
        select: { id: true },
      });
      const ids = activities.map((a) => a.id);
      if (ids.length > 0) {
        await this.db.client.activityRawPayload.deleteMany({
          where: { activityId: { in: ids } },
        });
        await this.db.client.activity.updateMany({
          where: { userId },
          data: { deletedAt: new Date() },
        });
      }
      await this.db.client.dailyMetrics.deleteMany({ where: { userId } });
    }

    await this.db.client.connection.delete({
      where: { userId_provider: { userId, provider: 'strava' } },
    });

    await this.invalidateUserCaches(userId);
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        connections: {
          select: {
            provider: true,
            status: true,
            externalAthleteId: true,
            lastSyncedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [activities, dailyMetrics] = await Promise.all([
      this.db.client.activity.findMany({
        where: { userId, deletedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
      this.db.client.dailyMetrics.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
      connections: user.connections,
      activities: activities.map((a) => ({
        ...a,
        startedAt: a.startedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        deletedAt: a.deletedAt?.toISOString() ?? null,
      })),
      dailyMetrics: dailyMetrics.map((m) => ({
        ...m,
        date: m.date.toISOString().slice(0, 10),
      })),
    };
  }

  async softDeleteAccount(userId: string): Promise<void> {
    const user = await this.db.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.deletedAt) throw new BadRequestException('Account already deleted');

    const conn = await this.tokens.getStravaTokens(userId);
    if (conn) {
      try {
        await this.strava.revokeAccess(conn);
      } catch {
        /* best effort */
      }
      await this.db.client.connection.delete({
        where: { userId_provider: { userId, provider: 'strava' } },
      });
    }

    await this.db.client.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await this.invalidateUserCaches(userId);
  }

  async purgeDeletedAccounts(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    const users = await this.db.client.user.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true },
    });

    for (const { id } of users) {
      const activities = await this.db.client.activity.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const ids = activities.map((a) => a.id);
      if (ids.length > 0) {
        await this.db.client.activityRawPayload.deleteMany({
          where: { activityId: { in: ids } },
        });
      }
      await this.db.client.user.delete({ where: { id } });
      this.logger.log(`Hard-deleted user ${id} after 30-day retention`);
    }

    return users.length;
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    await this.cache.deleteByPrefix(`analytics:${userId}:`);
  }
}
