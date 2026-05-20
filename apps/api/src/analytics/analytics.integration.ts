/**
 * Integration tests for analytics summary (Sprint 3).
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DatabaseService } from '../database/database.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { DailyMetricsService } from './daily-metrics.service.js';
import { TssService } from './tss.service.js';
import { CacheService } from '../cache/cache.service.js';

const TEST_SECRET = 'integration-test-secret-32-bytes!!';
const schemaPath = join(__dirname, '../../../../packages/database/prisma/schema.prisma');

class InMemoryCacheService {
  private readonly store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, _ttlSeconds: number): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.store.clear();
  }
}

describe('Analytics summary (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;
  let jwtService: JwtService;
  let userId: string;
  let connectionId: string;
  let token: string;

  beforeAll(async () => {
    process.env['AUTH_SECRET'] = TEST_SECRET;

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_fitness')
      .withUsername('test')
      .withPassword('test')
      .start();

    const connectionUrl = container.getConnectionUri();
    process.env['DATABASE_URL'] = connectionUrl;

    execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: connectionUrl },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({ datasources: { db: { url: connectionUrl } } });
    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_SECRET, signOptions: { algorithm: 'HS256' } }),
      ],
      controllers: [AnalyticsController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        {
          provide: DatabaseService,
          useValue: {
            client: prisma,
            onModuleInit: async () => {},
            onModuleDestroy: async () => {},
          },
        },
        AnalyticsService,
        DailyMetricsService,
        TssService,
        { provide: CacheService, useClass: InMemoryCacheService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleRef.get(JwtService);

    const user = await prisma.user.create({
      data: { email: 'analytics@test.trainlens.app', name: 'Analytics Test' },
    });
    userId = user.id;
    token = jwtService.sign({ sub: userId, email: user.email });

    const connection = await prisma.connection.create({
      data: {
        userId,
        provider: 'strava',
        externalAthleteId: '999',
        scope: 'activity:read_all',
        encryptedAccessToken: 'enc',
        encryptedRefreshToken: 'enc',
      },
    });
    connectionId = connection.id;

    await prisma.activity.createMany({
      data: [
        {
          userId,
          connectionId,
          externalId: 'act-1',
          provider: 'strava',
          name: 'Run A',
          activityType: 'Run',
          startedAt: new Date('2024-06-01T07:00:00.000Z'),
          durationSeconds: 3600,
          distanceMeters: 10000,
          elevationGainMeters: 100,
        },
        {
          userId,
          connectionId,
          externalId: 'act-2',
          provider: 'strava',
          name: 'Ride B',
          activityType: 'Ride',
          startedAt: new Date('2024-06-02T08:00:00.000Z'),
          durationSeconds: 7200,
          distanceMeters: 40000,
          elevationGainMeters: 200,
        },
      ],
    });

    await prisma.dailyMetrics.createMany({
      data: [
        {
          userId,
          date: new Date('2024-06-01T00:00:00.000Z'),
          totalActivities: 1,
          totalDistanceMeters: 10000,
          totalDurationSeconds: 3600,
          totalElevationGainMeters: 100,
        },
        {
          userId,
          date: new Date('2024-06-02T00:00:00.000Z'),
          totalActivities: 1,
          totalDistanceMeters: 40000,
          totalDurationSeconds: 7200,
          totalElevationGainMeters: 200,
        },
      ],
    });
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
    delete process.env['AUTH_SECRET'];
    delete process.env['DATABASE_URL'];
  });

  it('401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/analytics/summary').expect(401);
  });

  it('200 — returns correct totals for date range', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .query({ from: '2024-06-01', to: '2024-06-30' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.totalActivities).toBe(2);
    expect(body.totalDistanceMeters).toBe(50000);
    expect(body.totalDurationSeconds).toBe(10800);
    expect(body.totalElevationGainMeters).toBe(300);
    expect(body.sportDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ activityType: 'Run', count: 1, distanceMeters: 10000 }),
        expect.objectContaining({ activityType: 'Ride', count: 1, distanceMeters: 40000 }),
      ]),
    );
  });

  it('invalidates cached summary after metrics recalc', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .query({ from: '2024-06-01', to: '2024-06-30' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await prisma.activity.create({
      data: {
        userId,
        connectionId,
        externalId: 'act-3',
        provider: 'strava',
        name: 'Run C',
        activityType: 'Run',
        startedAt: new Date('2024-06-03T07:00:00.000Z'),
        durationSeconds: 1800,
        distanceMeters: 5000,
      },
    });

    const dailyMetrics = app.get(DailyMetricsService);
    await dailyMetrics.recalculateForUser(userId);

    const second = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .query({ from: '2024-06-01', to: '2024-06-30' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.body.totalActivities).toBe(3);
    expect(second.body.totalDistanceMeters).toBe(55000);
  });
});
