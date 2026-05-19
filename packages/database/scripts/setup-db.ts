/**
 * One-command database setup for local development.
 *
 * Usage (from monorepo root):
 *   pnpm db:setup
 *
 * What it does:
 *   1. Starts Docker Compose (postgres + redis) if not already running
 *   2. Waits for PostgreSQL to be healthy
 *   3. Applies Prisma migrations
 *   4. Creates the TimescaleDB hypertable on Activity
 *
 * Options:
 *   --reset   Drop and recreate the database before migrating
 */
import { execSync, spawnSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const ROOT = join(__dirname, '../../..');
const SCHEMA = join(__dirname, '../prisma/schema.prisma');
const DB_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/fitness_analytics';
const RESET = process.argv.includes('--reset');

function run(cmd: string, opts: { cwd?: string; silent?: boolean } = {}) {
  execSync(cmd, {
    cwd: opts.cwd ?? ROOT,
    stdio: opts.silent ? 'pipe' : 'inherit',
    env: { ...process.env, DATABASE_URL: DB_URL },
  });
}

function log(msg: string) {
  process.stdout.write(`\n${msg}\n`);
}

async function waitForPostgres(maxAttempts = 30, intervalMs = 1000) {
  log('⏳ Waiting for PostgreSQL to be ready...');
  for (let i = 1; i <= maxAttempts; i++) {
    const result = spawnSync('docker', [
      'exec',
      'trainlens-postgres',
      'pg_isready',
      '-U',
      'postgres',
      '-d',
      'fitness_analytics',
    ]);
    if (result.status === 0) {
      log('✅ PostgreSQL is ready');
      return;
    }
    process.stdout.write(`   attempt ${i}/${maxAttempts}...\r`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('PostgreSQL did not become ready in time. Is Docker running?');
}

async function main() {
  // ── 1. Docker Compose ──────────────────────────────────────────────────────
  log('🐳 Starting Docker Compose services...');
  run('docker compose up -d');
  await waitForPostgres();

  // ── 2. Reset (optional) ────────────────────────────────────────────────────
  if (RESET) {
    log('💥 --reset: dropping and recreating database...');
    run(
      `docker exec trainlens-postgres psql -U postgres -c "DROP DATABASE IF EXISTS fitness_analytics;"`,
    );
    run(
      `docker exec trainlens-postgres psql -U postgres -c "CREATE DATABASE fitness_analytics;"`,
    );
    run(
      `docker exec trainlens-postgres psql -U postgres -d fitness_analytics -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"`,
    );
    log('✅ Database recreated');
  }

  // ── 3. Prisma migrations ───────────────────────────────────────────────────
  log('🗄️  Applying Prisma migrations...');
  run(`npx prisma migrate deploy --schema=${SCHEMA}`);
  log('✅ Migrations applied');

  // ── 4. TimescaleDB hypertable ──────────────────────────────────────────────
  log('⏱️  Configuring TimescaleDB hypertable...');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  try {
    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `ALTER TABLE "ActivityRawPayload" DROP CONSTRAINT IF EXISTS "ActivityRawPayload_activityId_fkey"`,
      ),
      prisma.$executeRawUnsafe(
        `ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey"`,
      ),
      prisma.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "Activity_userId_provider_externalId_key"`,
      ),
    ]);

    // create_hypertable cannot run inside a transaction
    await prisma.$executeRawUnsafe(
      `SELECT create_hypertable('"Activity"', by_range('startedAt'), if_not_exists => TRUE)`,
    );

    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id, "startedAt")`,
      ),
      prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Activity_userId_provider_externalId_startedAt_key" ON "Activity"("userId", provider, "externalId", "startedAt")`,
      ),
    ]);

    log('✅ TimescaleDB hypertable configured');

    // Verify
    const rows = await prisma.$queryRaw<Array<{ hypertable_name: string }>>`
      SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'Activity'
    `;
    if (!rows[0]) throw new Error('Hypertable not found after creation');
  } finally {
    await prisma.$disconnect();
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  log('🚀 Database ready. Run `pnpm dev` to start the stack.\n');
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message ?? e);
  process.exit(1);
});
