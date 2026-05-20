import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';

describe('PostGIS integration', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
      .withDatabase('test_fitness')
      .withUsername('test')
      .withPassword('test')
      .start();

    const connectionUrl = container.getConnectionUri();
    process.env['DATABASE_URL'] = connectionUrl;

    const schemaPath = join(__dirname, '../../../../packages/database/prisma/schema.prisma');
    execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: connectionUrl },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({ datasources: { db: { url: connectionUrl } } });
    await prisma.$connect();
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it('ST_Distance returns a positive distance in meters', async () => {
    const rows = await prisma.$queryRaw<Array<{ dist: number }>>`
      SELECT ST_Distance(
        ST_MakePoint(0, 0)::geography,
        ST_MakePoint(0, 0.001)::geography
      ) AS dist
    `;
    expect(rows[0]?.dist).toBeGreaterThan(100);
    expect(rows[0]?.dist).toBeLessThan(120);
  });
});
