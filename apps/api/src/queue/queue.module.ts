import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QUEUE_NAMES } from './queue.constants';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    ...(parsed.password ? { password: parsed.password } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: parseRedisUrl(redisUrl),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    }),

    BullModule.registerQueue(
      { name: QUEUE_NAMES.BULK_IMPORT },
      { name: QUEUE_NAMES.ACTIVITY_SYNC },
      { name: QUEUE_NAMES.WEBHOOK_INGEST },
      { name: QUEUE_NAMES.ANALYTICS_RECALC },
    ),

    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),

    BullBoardModule.forFeature({ name: QUEUE_NAMES.BULK_IMPORT, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUE_NAMES.ACTIVITY_SYNC, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUE_NAMES.WEBHOOK_INGEST, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUE_NAMES.ANALYTICS_RECALC, adapter: BullMQAdapter }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
