import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
      {
        name: QUEUE_NAMES.BULK_IMPORT,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      },
      { name: QUEUE_NAMES.ACTIVITY_SYNC },
      { name: QUEUE_NAMES.WEBHOOK_INGEST },
      { name: QUEUE_NAMES.ANALYTICS_RECALC },
      { name: QUEUE_NAMES.DATA_EXPORT, defaultJobOptions: { attempts: 2 } },
      { name: QUEUE_NAMES.SEGMENT_METADATA_SYNC, defaultJobOptions: { attempts: 3 } },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
