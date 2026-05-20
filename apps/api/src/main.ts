// Load root .env before any module initialises (env vars must exist before
// NestJS DI wires providers like JwtStrategy that read them at construction).
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '../../.env'), override: false });

import './instrument.js';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000' });

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
