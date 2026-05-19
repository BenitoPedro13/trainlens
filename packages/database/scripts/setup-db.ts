/**
 * One-command database setup for local development.
 *
 * Usage (from monorepo root):
 *   pnpm db:setup           — start Docker, migrate, verify
 *   pnpm db:setup:reset     — drop DB first, then setup from scratch
 *
 * What it does:
 *   1. Starts Docker Compose (postgres + redis) if not already running
 *   2. Waits for PostgreSQL to be healthy
 *   3. Applies all Prisma migrations (including TimescaleDB hypertable setup)
 */
import { execSync, spawnSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const ROOT = join(__dirname, '../../..');
const DB_PKG = join(ROOT, 'packages/database');
const SCHEMA = join(DB_PKG, 'prisma/schema.prisma');
const DB_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/fitness_analytics';
const RESET = process.argv.includes('--reset');

function run(cmd: string, opts: { cwd?: string } = {}) {
  execSync(cmd, {
    cwd: opts.cwd ?? ROOT,
    stdio: 'inherit',
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

async function resetDatabase() {
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

async function main() {
  // ── 1. Docker Compose ──────────────────────────────────────────────────────
  log('🐳 Starting Docker Compose services...');
  run('docker compose up -d');
  await waitForPostgres();

  // ── 2. Reset (optional) ────────────────────────────────────────────────────
  if (RESET) await resetDatabase();

  // ── 3. Migrations (includes hypertable setup) ──────────────────────────────
  log('🗄️  Applying Prisma migrations...');
  run(`pnpm exec prisma migrate deploy --schema="${SCHEMA}"`, { cwd: DB_PKG });
  log('✅ Migrations applied');

  // ── 4. Verify ──────────────────────────────────────────────────────────────
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  try {
    const rows = await prisma.$queryRaw<Array<{ hypertable_name: string }>>`
      SELECT hypertable_name FROM timescaledb_information.hypertables
      WHERE hypertable_name = 'Activity'
    `;
    if (!rows[0]) throw new Error('Activity hypertable not found after migration');
    log('⏱️  TimescaleDB hypertable verified');
  } finally {
    await prisma.$disconnect();
  }

  log('🚀 Database ready. Run `pnpm dev` to start the stack.\n');
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message ?? e);
  process.exit(1);
});
