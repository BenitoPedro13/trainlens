# MVP Status (Sprints 0–6)

> Last updated: 2026-05-20  
> Canonical roadmap: [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md)

Legend: ✅ Done · ⚠️ Partial · ❌ Missing

## Sprint 0 — Skeleton

| Task | Status | Notes |
|------|--------|-------|
| 0.1–0.5 Monorepo, apps, shared, database | ✅ | |
| 0.6 Docker PG + Redis | ✅ | `timescale/timescaledb:latest-pg16` |
| 0.6 PostGIS + `ST_Distance` smoke test | ⚠️ | `postgis` em `init.sql` (DB existente precisa `CREATE EXTENSION` manual) |
| 0.7 Hypertable migration | ✅ | |
| 0.8 Pino | ✅ | |
| 0.9 Testcontainers | ✅ | |
| 0.10 CI | ✅ | `.github/workflows/ci.yml` |
| 0.11 packages/ui | ✅ | Placeholder |

## Sprint 1 — Auth

| Task | Status | Notes |
|------|--------|-------|
| 1.1–1.8 Auth, Strava OAuth, JWT, encryption | ✅ | |
| Block login for soft-deleted users | ✅ | `auth.ts` signIn + JWT strategy |

## Sprint 2 — Sync

| Task | Status | Notes |
|------|--------|-------|
| 2.1–2.14 Queues, Strava, webhooks, Sentry | ✅ | |
| 2.2 Bull Board behind auth | ⚠️ | Separate Express process :3002 |
| Deauthorize → delete Connection (ADR-014) | ✅ | Webhook apaga `Connection` |

## Sprint 3 — Dashboard MVP

| Task | Status | Notes |
|------|--------|-------|
| 3.1–3.3 Activities + summary APIs | ✅ | |
| 3.4 DailyMetrics | ✅ | |
| 3.5 Redis cache | ✅ | |
| 3.6 Dashboard | ✅ | |
| 3.7 Activity list + filters | ✅ | Server-side GET form (not TanStack) |
| 3.8 Detail: map + **laps table** | ✅ | `extractLapsFromRawPayload` + `ActivityLapsTable` |
| 3.9 Heatmap calendar | ✅ | CSS grid |
| 3.10 Layout + nav | ✅ | Analytics links added in Sprint 5 |

## Sprint 4 — Analytics Engine

| Task | Status | Notes |
|------|--------|-------|
| 4.1–4.8 TSS, CTL/ATL/TSB, APIs, backfill | ✅ | |
| 4.9–4.10 Estimated power | ❌ | |
| 4.11 Monotony + acute:chronic | ✅ | Cards no dashboard |
| Zones from streams | ❌ | Activity-level estimate only |
| User thresholds (FTP, max HR) | ❌ | Defaults in `shared` |

## Sprint 5 — Analytics UI

| Task | Status | Notes |
|------|--------|-------|
| 5.1–5.5 Training load, best efforts, zones, YoY | ✅ | Recharts |
| 5.2 PR progression chart | ❌ | Table only |
| 5.6–5.7 Interactive date/sport filters | ⚠️ | Date on some pages |
| 5.8 Monotony / consistency cards | ⚠️ | Monotonia + A:C no dashboard |
| 5.9 Power on detail | ⚠️ | Real power only, no estimated |

## Sprint 6 — Settings & Lifecycle (MVP shippable)

| Task | Status | Notes |
|------|--------|-------|
| 6.1 Settings UI | ✅ | Strava + export/disconnect/delete |
| 6.2 Disconnect (keep/delete data) | ✅ | `POST /users/me/connections/strava/disconnect` |
| 6.3 Data export JSON | ✅ | `POST /users/me/export` |
| 6.4 Account soft-delete | ✅ | `DELETE /users/me` |
| 6.5 Hard-delete job (30d) | ✅ | Cron 03:00 `AccountCleanupService` |
| 6.6 API rate limiting | ✅ | `@nestjs/throttler` 120 req/min |
| 6.7 Next.js error boundary | ✅ | `(app)/error.tsx` |
| 6.8 Deauthorize webhook (ADR-014) | ✅ | Apaga connection |
| 6.9 Sync status in UI | ✅ | `SyncStatusBanner` no dashboard |

## Next implementation order

1. **MVP polish:** thresholds (FTP/FC), TanStack Query, Bull Board auth
2. Sprint 4.9–4.10 estimated power + zones from streams
3. Sprint 5.2 PR progression chart + filtros interactivos
4. PostGIS smoke test em DB existente (`CREATE EXTENSION postgis`)
5. **Sprints 7+** — segmentos, goals, spatial, AI, planos (ADRs 016–020)
