import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { StravaModule } from './strava/strava.module';
import { SyncModule } from './sync/sync.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CacheModule } from './cache/cache.module';
import { ActivitiesModule } from './activities/activities.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import type { NestModule, MiddlewareConsumer } from '@nestjs/common';

const isDev = process.env['NODE_ENV'] !== 'production';
const sentryEnabled = Boolean(process.env['SENTRY_DSN']);

@Module({
  imports: [
    ...(sentryEnabled ? [SentryModule.forRoot()] : []),
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (_req, _res) => ({ context: 'HTTP' }),
        ...(isDev ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
        genReqId: (req) =>
          (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID(),
      },
    }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    QueueModule,
    StravaModule,
    SyncModule,
    WebhooksModule,
    ActivitiesModule,
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('(.*)');
  }
}
