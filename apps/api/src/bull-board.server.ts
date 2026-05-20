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

const boardUser = process.env['BULL_BOARD_USER'];
const boardPassword = process.env['BULL_BOARD_PASSWORD'];

function basicAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!boardUser || !boardPassword) {
    next();
    return;
  }
  const header = req.headers.authorization;
  if (!header?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    res.status(401).send('Authentication required');
    return;
  }
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const pass = sep >= 0 ? decoded.slice(sep + 1) : '';
  if (user === boardUser && pass === boardPassword) {
    next();
    return;
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
  res.status(401).send('Invalid credentials');
}

const app = express();
app.use(basicAuth);
app.use('/', serverAdapter.getRouter());

app.listen(port, '0.0.0.0', () => {
  console.log(`Bull Board running at http://localhost:${port}`);
});
