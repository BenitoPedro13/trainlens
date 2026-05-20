/**
 * Integration test: GET /analytics/training-load
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
  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }
  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
  async onModuleDestroy(): Promise<void> {}
}

describe('Training load endpoint (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let app: INestApplication;
  let jwtService: JwtService;
  let userId: string;
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

    const user = await prisma.user.create({ data: { email: 'load@test.trainlens.app' } });
    userId = user.id;
    token = jwtService.sign({ sub: userId });

    const connection = await prisma.connection.create({
      data: {
        userId,
        provider: 'strava',
        externalAthleteId: '1',
        scope: 'read',
        encryptedAccessToken: 'x',
        encryptedRefreshToken: 'y',
      },
    });

    await prisma.activity.create({
      data: {
        userId,
        connectionId: connection.id,
        externalId: 'run-1',
        provider: 'strava',
        name: 'Run',
        activityType: 'Run',
        startedAt: new Date('2024-06-01T07:00:00Z'),
        durationSeconds: 3600,
        distanceMeters: 10000,
        tss: 80,
      },
    });

    const dailyMetrics = app.get(DailyMetricsService);
    await dailyMetrics.recalculateForUser(userId);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
    delete process.env['AUTH_SECRET'];
    delete process.env['DATABASE_URL'];
  });

  it('returns CTL/ATL/TSB time series', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/analytics/training-load')
      .query({ from: '2024-06-01', to: '2024-06-10' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.points.length).toBeGreaterThan(0);
    expect(body.points[0]).toMatchObject({
      date: expect.any(String),
      tss: expect.any(Number),
      ctl: expect.any(Number),
      atl: expect.any(Number),
      tsb: expect.any(Number),
    });
  });
});
