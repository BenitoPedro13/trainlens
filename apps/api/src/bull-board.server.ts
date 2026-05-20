/**
 * Standalone Bull Board UI (Express on BULL_BOARD_PORT).
 *
 * NestJS 10 uses Fastify 4; @bull-board/fastify 7 requires Fastify 5.
 * A separate Express process avoids version conflicts while keeping the same Redis.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env'), override: false });

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue/queue.constants';

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    ...(parsed.password ? { password: parsed.password } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const connection = parseRedisUrl(redisUrl);
const port = parseInt(process.env['BULL_BOARD_PORT'] ?? '3002', 10);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: Object.values(QUEUE_NAMES).map(
    (name) => new BullMQAdapter(new Queue(name, { connection })),
  ),
  serverAdapter,
});

const app = express();
app.use('/', serverAdapter.getRouter());

app.listen(port, '0.0.0.0', () => {
  console.log(`Bull Board running at http://localhost:${port}`);
});
