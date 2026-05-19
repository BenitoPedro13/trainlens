/**
 * Database setup script.
 * Runs Prisma migrations and then applies TimescaleDB hypertable configuration.
 *
 * Usage:
 *   pnpm --filter @trainlens/database db:setup
 *
 * Prerequisites:
 *   - Docker Compose running: docker compose up -d
 *   - DATABASE_URL set in environment or .env file
 */
import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗄️  Running Prisma migrations...');
  execSync('prisma migrate deploy', { stdio: 'inherit', cwd: join(__dirname, '..') });

  console.log('⏱️  Applying TimescaleDB hypertable...');
  const sql = readFileSync(join(__dirname, 'create-hypertable.sql'), 'utf-8');

  // Split on semicolons and run non-empty statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log('✅ Database setup complete');

  // Verify TimescaleDB is working
  const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW()`;
  console.log('📡 Database connection verified at:', result[0]?.now);
}

main()
  .catch((e) => {
    console.error('❌ Database setup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
