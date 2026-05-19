# @trainlens/database

Prisma-based database package for TrainLens. Shared across `apps/api` and `apps/web`.

## Setup

```bash
cp .env.example .env   # fill in values once
pnpm db:setup          # starts Docker, migrates, configures TimescaleDB
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

> **TimescaleDB note:** The `Activity` hypertable requires `startedAt` in every unique
> constraint. The PK becomes composite `(id, startedAt)` in the DB while Prisma schema
> keeps `@id` on `id` for ergonomic queries. This divergence is intentional — see
> [ADR-002](../../adrs/ADR-002.md).

## Other scripts

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:migrate` | Create + apply a new migration (dev) |
| `pnpm db:push` | Sync schema to DB without a migration file (dev only) |
| `pnpm db:studio` | Open Prisma Studio |
