# @trainlens/database

Prisma-based database package for TrainLens. Shared across `apps/api` and `apps/web`.

## Setup

```bash
# .env lives at the monorepo root (../../.env from this package)
pnpm db:setup          # starts Docker, migrates, configures TimescaleDB
pnpm db:migrate        # create/apply migrations (loads root .env automatically)
```

Add `--reset` to wipe and recreate the database from scratch:

```bash
pnpm db:setup:reset
```

## What `db:setup` does

1. `docker compose up -d` — starts PostgreSQL (TimescaleDB) + Redis
2. Waits for PostgreSQL to be healthy
3. `prisma migrate deploy` — applies all pending migrations
4. Converts the `Activity` table to a TimescaleDB hypertable

> **TimescaleDB note:** `Activity` uses `@@id([id, startedAt])` in the Prisma schema so
> it matches the hypertable in Postgres. Do not let `prisma migrate dev` rewrite the PK
> to `id` only — that breaks TimescaleDB (error TS103). If a migration fails, run
> `pnpm db:repair:timescale` then `pnpm db:migrate:deploy`. See [ADR-002](../../adrs/ADR-002.md).

## Other scripts

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:migrate` | Create + apply a new migration (dev) |
| `pnpm db:push` | Sync schema to DB without a migration file (dev only) |
| `pnpm db:studio` | Open Prisma Studio |
