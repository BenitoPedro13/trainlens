import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@trainlens/database';
import { DatabaseService } from '../database/database.service';
import { SyncService } from '../sync/sync.service';
import {
  buildStravaIdempotencyKey,
  type StravaWebhookEvent,
  type StravaWebhookVerifyQuery,
} from './strava-webhook.types';

@Injectable()
export class StravaWebhookService {
  private readonly logger = new Logger(StravaWebhookService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly sync: SyncService,
  ) {}

  verifySubscription(query: StravaWebhookVerifyQuery): { 'hub.challenge': string } | null {
    const mode = query['hub.mode'] ?? query.hub?.mode;
    const challenge = query['hub.challenge'] ?? query.hub?.challenge;
    const token = query['hub.verify_token'] ?? query.hub?.verify_token;
    const expected = process.env['STRAVA_WEBHOOK_VERIFY_TOKEN'];

    if (mode !== 'subscribe' || !challenge || !token || !expected) {
      return null;
    }
    if (token !== expected) {
      this.logger.warn('Strava webhook verify_token mismatch');
      return null;
    }

    this.logger.log('Strava webhook subscription verified');
    return { 'hub.challenge': challenge };
  }

  /**
   * Persists the event and enqueues background processing.
   * Must complete quickly (<2s) — Strava requirement.
   */
  async ingestEvent(event: StravaWebhookEvent): Promise<void> {
    const idempotencyKey = buildStravaIdempotencyKey(event);

    const existing = await this.db.client.webhookEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      this.logger.debug(`Duplicate webhook skipped: ${idempotencyKey}`);
      return;
    }

    const connection = await this.db.client.connection.findFirst({
      where: { provider: 'strava', externalAthleteId: String(event.owner_id) },
      select: { userId: true },
    });

    const userId = connection?.userId ?? null;
    const eventType = `${event.object_type}.${event.aspect_type}`;

    const record = await this.db.client.webhookEvent.create({
      data: {
        idempotencyKey,
        provider: 'strava',
        userId,
        eventType,
        externalId: String(event.object_id),
        objectType: event.object_type,
        payload: event as unknown as Prisma.InputJsonValue,
        status: userId ? 'pending' : 'skipped',
        ...(userId ? {} : { errorMessage: 'No connection for owner_id', processedAt: new Date() }),
      },
    });

    if (!userId) {
      this.logger.warn(
        `Webhook ${idempotencyKey} skipped — no connection for athlete ${event.owner_id}`,
      );
      return;
    }

    await this.sync.enqueueWebhookIngest(record.id);
    this.logger.log(`Webhook ingested: ${idempotencyKey} (event ${record.id})`);
  }
}
