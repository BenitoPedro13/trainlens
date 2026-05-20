import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { StravaModule } from './strava/strava.module';
import { SyncModule } from './sync/sync.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import type { NestModule, MiddlewareConsumer } from '@nestjs/common';

const isDev = process.env['NODE_ENV'] !== 'production';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (_req, _res) => ({ context: 'HTTP' }),
        ...(isDev ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
        genReqId: (req) =>
          (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID(),
      },
    }),
    DatabaseModule,
    AuthModule,
    QueueModule,
    StravaModule,
    SyncModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('(.*)');
  }
}
