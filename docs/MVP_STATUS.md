# MVP Status (Sprints 0–6)

> Last updated: 2026-05-21  
> Canonical roadmap: [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md)

Legend: ✅ Done · ⚠️ Partial · ❌ Missing

## Sprint 0 — Skeleton

| Task | Status | Notes |
|------|--------|-------|
| 0.1–0.5 Monorepo, apps, shared, database | ✅ | |
| 0.6 Docker PG + Redis | ✅ | `timescale/timescaledb:latest-pg16` |
| 0.6 PostGIS + `ST_Distance` smoke test | ✅ | Integration test + `/health` postgis check |
| 0.7 Hypertable migration | ✅ | |
| 0.8 Pino | ✅ | |
| 0.9 Testcontainers | ✅ | |
| 0.10 CI | ✅ | |
| 0.11 packages/ui | ⚠️ | Placeholder (shared chart components still in `apps/web`) |

## Sprint 1 — Auth

| Task | Status | Notes |
|------|--------|-------|
| 1.1–1.8 Auth, Strava OAuth, JWT, encryption | ✅ | |
| Block login for soft-deleted users | ✅ | |

## Sprint 2 — Sync

| Task | Status | Notes |
|------|--------|-------|
| 2.1–2.14 Queues, Strava, webhooks, Sentry | ✅ | |
| 2.2 Bull Board behind auth | ✅ | Basic auth via `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` |
| Deauthorize → delete Connection | ✅ | |

## Sprint 3 — Dashboard MVP

| Task | Status | Notes |
|------|--------|-------|
| 3.1–3.10 Core dashboard, activities, heatmap, laps | ✅ | Heatmap uses local calendar day |
| 3.7 TanStack Query on activity list | ❌ | Server-side GET filters (acceptable MVP) |

## Sprint 4 — Analytics Engine

| Task | Status | Notes |
|------|--------|-------|
| 4.1–4.8 TSS, CTL/ATL/TSB, APIs, backfill | ✅ | |
| 4.9–4.10 Estimated power | ✅ | Run/ride model; stored on `Activity.estimatedPowerWatts` |
| 4.11 Monotony + acute:chronic | ✅ | |
| Zones from streams | ✅ | HR zones from heartrate stream when raw payload exists |
| User thresholds (FTP, max HR, weight, pace) | ✅ | `User` fields + Settings form; used in TSS/power |

## Sprint 5 — Analytics UI

| Task | Status | Notes |
|------|--------|-------|
| 5.1–5.5 Training load, best efforts, zones, YoY | ✅ | |
| 5.2 PR progression chart | ✅ | `GET /analytics/best-efforts/progression` + Recharts |
| 5.6–5.7 Date + sport filters | ✅ | best-efforts, zones, progress, training-load |
| 5.8 Monotony / consistency cards | ✅ | Dashboard |
| 5.9 Power on detail | ✅ | Real vs estimated label |

## Sprint 6 — Settings & Lifecycle

| Task | Status | Notes |
|------|--------|-------|
| 6.1–6.9 | ✅ | Export, disconnect, delete, throttler, error boundary, sync banner |

## MVP Polish (completed post-Sprint 6)

| Item | Status | Notes |
|------|--------|-------|
| TanStack Query on activities | ✅ | `useActivities` hook via `/api/proxy/activities` proxy |
| `packages/ui` extraction | ✅ | 5 chart components moved; re-exported from `@trainlens/ui` |
| Pace histogram | ✅ | `GET /analytics/pace-histogram` + chart on zones page |
| Strava adapter HTTP fixtures | ✅ | nock-based unit tests in `strava.adapter.spec.ts` |
| Data export background job | ✅ | `ExportJob` table + `data-export` BullMQ queue; async polling UX |
| Strava deauthorize notification | ✅ | Marks connection `revoked`; sync-status banner shows reconnect link |
| Auth edge-safe split | ✅ | `auth.config.ts` for middleware (no Prisma on Edge); 401 calls `signOut` |

## Sprint 7 — Segments (complete core, partial advanced)

| Task | Status | Notes |
|------|--------|-------|
| 7.1 Schema: Segment, SegmentEffort, SegmentLeaderboardSnapshot | ✅ | Migration `20260521052001_segments` |
| 7.2 Extract efforts during activity sync | ✅ | `activity-sync.processor` calls `SegmentPersistenceService` |
| 7.3 Backfill from existing ActivityRawPayload | ❌ | Not yet — no one-time backfill job |
| 7.4 Lazy segment metadata fetch from Strava | ❌ | Queue registered; processor not built |
| 7.5 / 7.6 API: list + detail with efforts | ✅ | `GET /segments`, `GET /segments/:id` |
| 7.7 Strava leaderboard endpoint | ❌ | Not yet |
| 7.8 / 7.9 Segment detail + list pages | ✅ | `/segments`, `/segments/[id]` + effort progression chart |
| 7.10 Matched efforts comparison | ❌ | Not yet |

## Next: Sprint 8 — Goals & Targets

Goals (Goal, GoalProgress) → progress engine → pace status → daily rollover job → dashboard widget → `/goals` page (ADR-019).
