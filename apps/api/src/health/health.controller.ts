import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { DatabaseService } from '../database/database.service';
import { RedisHealthIndicator } from './redis.health';
import { PostgisHealthIndicator } from './postgis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly db: DatabaseService,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly postgisHealth: PostgisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks = [
      () => this.prismaHealth.pingCheck('db', this.db.client),
      () => this.redisHealth.isHealthy('redis'),
    ];
    if (process.env['CHECK_POSTGIS'] !== 'false') {
      checks.push(() => this.postgisHealth.isHealthy('postgis'));
    }
    return this.health.check(checks);
  }
}
