import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { StravaAdapter } from '../strava/strava.adapter';
import { ConnectionTokensService } from '../sync/connection-tokens.service';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import type { AthleteThresholds, TrainingSettings } from '@trainlens/shared';
import { resolveAthleteThresholds } from '@trainlens/shared';
import { QUEUE_NAMES, type DataExportJobData } from '../queue/queue.constants';

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
    @InjectQueue(QUEUE_NAMES.DATA_EXPORT) private readonly exportQueue: Queue<DataExportJobData>,
  ) {}

  async getTrainingSettings(userId: string): Promise<TrainingSettings> {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        ftpWatts: true,
        maxHeartRate: true,
        weightKg: true,
        thresholdPaceSecondsPerKm: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ftpWatts: user.ftpWatts,
      maxHeartRate: user.maxHeartRate,
      weightKg: user.weightKg,
      thresholdPaceSecondsPerKm: user.thresholdPaceSecondsPerKm,
    };
  }

  async updateTrainingSettings(
    userId: string,
    body: Partial<TrainingSettings>,
  ): Promise<TrainingSettings> {
    const user = await this.db.client.user.update({
      where: { id: userId },
      data: {
        ...(body.ftpWatts !== undefined && { ftpWatts: body.ftpWatts }),
        ...(body.maxHeartRate !== undefined && { maxHeartRate: body.maxHeartRate }),
        ...(body.weightKg !== undefined && { weightKg: body.weightKg }),
        ...(body.thresholdPaceSecondsPerKm !== undefined && {
          thresholdPaceSecondsPerKm: body.thresholdPaceSecondsPerKm,
        }),
      },
      select: {
        ftpWatts: true,
        maxHeartRate: true,
        weightKg: true,
        thresholdPaceSecondsPerKm: true,
      },
    });
    await this.cache.deleteByPrefix(`analytics:${userId}:`);
    return {
      ftpWatts: user.ftpWatts,
      maxHeartRate: user.maxHeartRate,
      weightKg: user.weightKg,
      thresholdPaceSecondsPerKm: user.thresholdPaceSecondsPerKm,
    };
  }

  async getAthleteThresholds(userId: string): Promise<AthleteThresholds> {
    const settings = await this.getTrainingSettings(userId);
    return resolveAthleteThresholds(settings);
  }

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
      await Promise.all([
        this.db.client.dailyMetrics.deleteMany({ where: { userId } }),
        this.db.client.segmentEffort.deleteMany({ where: { userId } }),
        this.db.client.segmentLeaderboardSnapshot.deleteMany({ where: { userId } }),
      ]);
    }

    await this.db.client.connection.delete({
      where: { userId_provider: { userId, provider: 'strava' } },
    });

    await this.invalidateUserCaches(userId);
  }

  async requestExport(userId: string): Promise<{ exportJobId: string }> {
    const job = await this.db.client.exportJob.create({
      data: { userId, status: 'pending' },
    });
    await this.exportQueue.add('export', { userId, exportJobId: job.id });
    return { exportJobId: job.id };
  }

  async getExportStatus(
    userId: string,
    exportJobId: string,
  ): Promise<{ status: string; expiresAt: string | null; errorMessage: string | null }> {
    const job = await this.db.client.exportJob.findFirst({
      where: { id: exportJobId, userId },
    });
    if (!job) throw new NotFoundException('Export job not found');
    return {
      status: job.status,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      errorMessage: job.errorMessage,
    };
  }

  async downloadExport(userId: string, exportJobId: string): Promise<Record<string, unknown>> {
    const job = await this.db.client.exportJob.findFirst({
      where: { id: exportJobId, userId, status: 'ready' },
    });
    if (!job) throw new NotFoundException('Export not ready or expired');
    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new BadRequestException('Export has expired — request a new one');
    }

    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, createdAt: true,
        connections: {
          select: { provider: true, status: true, externalAthleteId: true, lastSyncedAt: true, createdAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [activities, dailyMetrics] = await Promise.all([
      this.db.client.activity.findMany({ where: { userId, deletedAt: null }, orderBy: { startedAt: 'desc' } }),
      this.db.client.dailyMetrics.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    ]);

    return {
      version: 1,
      exportedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() },
      connections: user.connections,
      activities: activities.map((a) => ({
        ...a,
        startedAt: a.startedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        deletedAt: a.deletedAt?.toISOString() ?? null,
      })),
      dailyMetrics: dailyMetrics.map((m) => ({ ...m, date: m.date.toISOString().slice(0, 10) })),
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
