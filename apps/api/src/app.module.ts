import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
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
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('(.*)');
  }
}
