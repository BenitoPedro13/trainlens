# MVP Status (Sprints 0–6)

> Last updated: 2026-05-20  
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

## Remaining before Sprint 7

| Item | Notes |
|------|-------|
| TanStack Query on activities | Optional polish |
| `packages/ui` extraction | Optional |
| Run migration `20260520180000_user_thresholds_estimated_power` | Required after pull |
| Re-sync or analytics recalc | Backfill `estimatedPowerWatts` + TSS with new thresholds |

## Next: Sprint 7+ (parity)

Segments → Goals → Spatial → AI → Training Plans (ADRs 016–020).
