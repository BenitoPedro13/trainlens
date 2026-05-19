import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';

describe('Database integration', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_fitness')
      .withUsername('test')
      .withPassword('test')
      .start();

    const connectionUrl = container.getConnectionUri();
    process.env['DATABASE_URL'] = connectionUrl;

    const schemaPath = join(__dirname, '../../../../packages/database/prisma/schema.prisma');

    // Use db push for tests — applies schema without needing migration files
    execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: connectionUrl },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({ datasources: { db: { url: connectionUrl } } });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it('connects to PostgreSQL and executes a query', async () => {
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW()`;
    expect(result).toHaveLength(1);
    expect(result[0]?.now).toBeInstanceOf(Date);
  });

  it('creates and retrieves a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@trainlens.app',
        name: 'Test User',
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@trainlens.app');
    expect(user.createdAt).toBeInstanceOf(Date);

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe('test@trainlens.app');
  });

  it('enforces unique email constraint', async () => {
    await prisma.user.create({ data: { email: 'unique@trainlens.app' } });

    await expect(prisma.user.create({ data: { email: 'unique@trainlens.app' } })).rejects.toThrow();
  });

  it('cascades deletion from User to Activity', async () => {
    const user = await prisma.user.create({ data: { email: 'cascade@trainlens.app' } });
    const connection = await prisma.connection.create({
      data: {
        userId: user.id,
        provider: 'strava',
        externalAthleteId: 'athlete_123',
        scope: 'activity:read_all',
        encryptedAccessToken: 'enc_token_abc',
        encryptedRefreshToken: 'enc_refresh_xyz',
      },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        externalId: 'strava_act_999',
        provider: 'strava',
        name: 'Morning Run',
        activityType: 'Run',
        startedAt: new Date('2024-01-15T07:00:00Z'),
        durationSeconds: 3600,
        distanceMeters: 10000,
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const remaining = await prisma.activity.findMany({ where: { userId: user.id } });
    expect(remaining).toHaveLength(0);
  });
});
