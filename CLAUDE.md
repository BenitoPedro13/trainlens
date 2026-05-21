# TrainLens — Claude Code Context

## What this project is

A personal fitness analytics platform. Ingests data from Strava (and eventually Garmin, Apple Health, Polar), stores it in TimescaleDB, and presents training insights: TSS, CTL/ATL/TSB, best efforts, HR zones, year-over-year, and more.

**MVP (Sprints 0–6) is complete and functional.** Sprint 7 (Segments) is next.

---

## Monorepo structure

```
apps/web        Next.js 14 (App Router) — pages, components, charts
apps/api        NestJS — REST /api/v1/, BullMQ jobs, analytics engine
packages/database   Prisma schema + migrations
packages/shared     Domain types, FitnessProvider interface, analytics formulas (unit-tested)
packages/ui         Placeholder — charts currently live in apps/web
adrs/               ADR-001 through ADR-020
docs/               ARCHITECTURE_DESIGN_BASE.md, MVP_STATUS.md, DEVELOPMENT_ROADMAP.md
```

---

## Key commands

```bash
pnpm db:setup          # Start Docker + apply migrations + verify hypertable
pnpm db:setup:reset    # Drop DB, recreate, apply all migrations from scratch
pnpm dev               # All apps (web :3000, api :3001, Bull Board :3002)
pnpm build             # Turborepo build
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm test              # Unit + integration (Testcontainers)
pnpm db:migrate        # prisma migrate dev (requires Docker up)
pnpm db:studio         # Prisma Studio GUI
```

---

## Database

- **PostgreSQL 16 + TimescaleDB** (Docker: `trainlens-postgres`)
- **Redis 7** (Docker: `trainlens-redis`)
- Activity table is a **TimescaleDB hypertable** partitioned on `startedAt` — composite PK `(id, startedAt)`
- If `prisma migrate dev` reports drift on the Activity index, run `pnpm db:setup:reset` or `pnpm --filter @trainlens/database db:repair:timescale`
- 6 migrations applied as of 2026-05-21, including `estimatedPowerWatts` + `thresholdPaceSecondsPerKm` on User

---

## Architecture patterns

- **Adapter-first**: all provider code lives behind `FitnessProvider` interface in `packages/shared`. Business logic never imports from Strava directly.
- **BullMQ queues**: `bulk-import`, `activity-sync`, `webhook-ingest`, `analytics-recalc`
- **Token encryption**: AES-256-GCM envelope encryption (per-user key derived from master KEK). See ADR-011.
- **Analytics formulas**: pure functions in `packages/shared/src/analytics/` — TSS, CTL/ATL/TSB, best efforts, zones, estimated power, monotony, acute:chronic ratio.
- **Caching**: Redis with 5-minute TTL on summary/analytics endpoints; invalidated on sync.
- **Webhook idempotency**: `WebhookEvent` table with composite dedup key. See ADR-013.

---

## API

- Base: `http://localhost:3001/api/v1/`
- Auth: Bearer JWT (from Auth.js session)
- Key endpoints: `GET /activities`, `GET /activities/:id`, `GET /analytics/summary`, `GET /analytics/training-load`, `GET /analytics/best-efforts`, `GET /analytics/zones`, `GET /analytics/year-over-year`, `POST /webhooks/strava`, `GET /health`

---

## Frontend

- Next.js App Router with Server Components as default
- Filters use `searchParams` (not TanStack Query — ADR-007 calls for it but not yet installed)
- Charts: Recharts; calendar heatmap is custom CSS/React; Leaflet for activity maps
- Auth: Auth.js with Strava OAuth + email providers

---

## What's NOT implemented yet

| Sprint | Feature |
|--------|---------|
| 7 | Segments (Segment, SegmentEffort, SegmentLeaderboardSnapshot tables + sync + UI) |
| 8 | Goals (Goal, GoalProgress tables + progress engine) |
| 9 | Spatial (Activity.route geography column, geo heatmap, matched runs) |
| 10 | AI Insights (InsightsProvider, per-activity summaries, SSE) |
| 11 | Training Plans (PlanTemplate, UserPlan, PlannedWorkout) |
| 12+ | Multi-source adapters (Garmin, Apple Health, Polar) |

Known MVP polish gaps: TanStack Query, pace histogram, E2E Playwright tests, Strava adapter HTTP fixtures (nock/msw), `packages/ui` extraction.

---

## ADRs to read before touching specific areas

| Area | ADR |
|------|-----|
| Database / TimescaleDB | ADR-002, ADR-003 |
| Sync engine / BullMQ | ADR-004, ADR-013 |
| Auth / tokens | ADR-005, ADR-011 |
| Adapter development | ADR-006 |
| Frontend data fetching | ADR-007 |
| Charts | ADR-008 |
| Testing | ADR-015 |
| Spatial / PostGIS | ADR-016 |
| Segments | ADR-017 |
| AI Insights | ADR-018 |
| Goals | ADR-019 |
| Training Plans | ADR-020 |

---

## Environment

Copy `.env.example` → `.env`. Required groups: `DATABASE_URL`, `REDIS_URL`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_API_URL`.
