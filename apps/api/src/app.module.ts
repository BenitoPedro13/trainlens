import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { UsersModule } from './users/users.module';
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
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    DatabaseModule,
    CacheModule,
    AuthModule,
    QueueModule,
    StravaModule,
    SyncModule,
    WebhooksModule,
    ActivitiesModule,
    AnalyticsModule,
    UsersModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('(.*)');
  }
}
