# Fitness Analytics Platform: Architecture Design Document

> **Status:** Draft v1.1
> **Scope:** Web MVP (Strava-first), extensible to multi-source
> **Stack:** Next.js · NestJS · PostgreSQL/TimescaleDB · Redis · BullMQ · Docker · Turborepo
> **ADR Log:** See `/adrs/` directory for all architectural decision records

---

## 1. Vision & Goals

Build a free, multi-source fitness analytics platform that ingests exercise data from providers like Strava, Garmin, Apple Health, and Polar, and turns raw activity data into meaningful, actionable insights for athletes of all levels.

**Core principles:**

- **Adapter-first**: every data source is a pluggable adapter; the core domain never depends on Strava
- **Insight-driven**: raw data is cheap; interpretation is the value
- **Privacy-respecting**: users own their data; no selling, no ads
- **Observable**: structured logging, error tracking, and job monitoring from day one
- **Monorepo from day 1**: shared types and contracts prevent drift as the team grows

---

## 2. Interesting Analytics & Visualizations

These are organized by insight depth, from simple glance metrics to advanced coaching intelligence.

### 2.1 Training Load & Fitness

| Metric | Description | Why Athletes Love It |
|--------|-------------|----------------------|
| **CTL / ATL / TSB (Fitness/Fatigue/Form)** | Chronic Training Load, Acute Training Load, Training Stress Balance (the "Performance Management Chart") | Industry standard for periodization |
| **Weekly TSS trend** | Training Stress Score over rolling weeks | Shows whether training is progressive or chaotic |
| **Training monotony** | Ratio of average to std dev of daily load | High monotony = injury risk |
| **Acute:Chronic ratio** | If A:C > 1.5, injury risk spikes | Actionable safety alert |

### 2.2 Volume & Consistency

| Metric | Description |
|--------|-------------|
| **Activity heatmap calendar** | GitHub-style contribution graph by day |
| **Weekly/monthly distance & elevation** | Bar chart with rolling average overlay |
| **Streak tracking** | Longest streak, current streak, near-miss detection |
| **Sport distribution** | Donut chart: % run vs ride vs swim vs etc. |
| **Year-over-year comparison** | Same week last year overlaid |

### 2.3 Performance & Progression

| Metric | Description |
|--------|-------------|
| **Best efforts over time** | 400m, 1K, 1mi, 5K, 10K, half, full: line chart of PRs |
| **Pace/Power distribution histogram** | Time spent in each zone |
| **Heart rate zones pie** | % time in Z1-Z5 |
| **VO₂max estimation trend** | Derived from HR + pace data |
| **Critical Power / Functional Threshold Pace** | Modeled from best efforts |
| **Fastest segments** | Personal leaderboard on repeated routes |

### 2.4 Recovery & Patterns

| Metric | Description |
|--------|-------------|
| **Rest day distribution** | Are you actually resting? Day-of-week analysis |
| **Morning vs evening preference** | Hour-of-day heatmap |
| **Longest gap between activities** | Useful for identifying detraining risks |
| **Post-race recovery curve** | Load drop after big efforts |

### 2.5 Geo & Route Intelligence

| Metric | Description |
|--------|-------------|
| **Activity heatmap (geo)** | Aggregated GPS overlay on a map (Leaflet/Mapbox) |
| **Most frequent routes** | Clustered by start/end proximity |
| **Elevation profile archive** | Per-activity and cumulative |
| **Explore radius** | How far from home do you typically train? |

### 2.6 Advanced / Gamified

| Metric | Description |
|--------|-------------|
| **"Fitness age" score** | Compare your load profile to age-matched athletes |
| **Predicted race times** | Riegel formula + HR-adjusted |
| **Training plan adherence** | If user sets a target, % completion |
| **Milestone achievements** | 1000km total, 100 activities, etc. |

---

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                    │
│  Next.js (App Router)  ·  TanStack Query  ·  Recharts/D3        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST (v1) + SSE
┌──────────────────────────────▼──────────────────────────────────┐
│  API LAYER                                                       │
│  NestJS  ·  REST  ·  JWT Auth  ·  Rate Limiting  ·  Pino Logger │
└────────┬─────────────────────┬───────────────────────────────────┘
         │                     │
┌────────▼────────┐   ┌────────▼────────┐
│  Core Domain    │   │  Sync Engine    │
│  Analytics      │   │  BullMQ Queue   │
│  Service        │   │  Workers        │
└────────┬────────┘   └────────┬────────┘
         │                     │
┌────────▼─────────────────────▼────────┐
│  DATA LAYER                           │
│  PostgreSQL + TimescaleDB             │
│  Redis (cache + queue broker)         │
└────────┬──────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────────────────────┐
│  ADAPTER LAYER (pluggable, each adapter is its own NestJS module) │
│  StravaAdapter  │  GarminAdapter*  │  AppleHealthAdapter*         │
│  * = future                                                        │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow (Strava sync)

```
User connects Strava → OAuth2 PKCE flow → store tokens (encrypted)
                                  │
                    ┌─────────────▼──────────────┐
                    │  Initial bulk import        │
                    │  BullMQ job: paginate        │
                    │  Strava /activities API      │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Strava Webhook (push)       │
                    │  activity.create / update /  │
                    │  delete events               │
                    │  → deduplicate by event ID   │
                    │  → enqueue sync job          │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Normalization layer         │
                    │  StravaActivity → Activity   │
                    │  (canonical domain model)    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Persist to TimescaleDB      │
                    │  Invalidate Redis cache      │
                    │  Recalculate DailyMetrics    │
                    │  Trigger analytics recalc    │
                    └─────────────────────────────┘
```

---

## 4. Architectural Decision Records

All ADRs are maintained as individual documents in the `/adrs/` directory.

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](adrs/ADR-001.md) | Monorepo Tooling: Turborepo + pnpm | Accepted |
| [ADR-002](adrs/ADR-002.md) | Database: PostgreSQL + TimescaleDB | Accepted |
| [ADR-003](adrs/ADR-003.md) | ORM: Prisma | Accepted |
| [ADR-004](adrs/ADR-004.md) | Background Jobs: BullMQ + Redis | Accepted |
| [ADR-005](adrs/ADR-005.md) | Authentication: Auth.js + NestJS JWT | Accepted |
| [ADR-006](adrs/ADR-006.md) | Adapter Architecture: NestJS Modules + Shared Interface | Accepted |
| [ADR-007](adrs/ADR-007.md) | Frontend Data Fetching: TanStack Query + Server Components | Accepted |
| [ADR-008](adrs/ADR-008.md) | Charts & Visualization: Recharts + D3 | Accepted |
| [ADR-009](adrs/ADR-009.md) | Observability: Pino + Sentry + Bull Board | Accepted |
| [ADR-010](adrs/ADR-010.md) | Raw Activity Data Storage Strategy | Accepted |
| [ADR-011](adrs/ADR-011.md) | Token & Key Management | Accepted |
| [ADR-012](adrs/ADR-012.md) | API Versioning: URL Prefix Strategy | Accepted |
| [ADR-013](adrs/ADR-013.md) | Webhook Reliability & Idempotency | Accepted |
| [ADR-014](adrs/ADR-014.md) | Data Lifecycle, Deletion & GDPR Compliance | Accepted |
| [ADR-015](adrs/ADR-015.md) | Testing Strategy | Accepted |

---

## 5. Monorepo Structure

```
fitness-analytics/
├── apps/
│   ├── web/                          # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, connect Strava
│   │   │   ├── dashboard/            # Overview page
│   │   │   ├── training-load/        # CTL/ATL/TSB charts
│   │   │   ├── activities/           # Activity log & detail
│   │   │   ├── routes/               # Geo heatmaps
│   │   │   ├── progress/             # Best efforts, PRs
│   │   │   └── settings/             # Account, data export, deletion
│   │   └── ...
│   │
│   └── api/                          # NestJS
│       └── src/
│           ├── activities/           # Activities module (CRUD, aggregation)
│           ├── analytics/            # Analytics computation module
│           ├── auth/                 # JWT guard, user context
│           ├── common/
│           │   ├── filters/          # Global exception filters
│           │   ├── interceptors/     # Logging, timing interceptors
│           │   └── middleware/       # Request ID, correlation ID
│           ├── health/              # Health check endpoints
│           ├── providers/
│           │   ├── strava/           # StravaAdapter + webhook controller
│           │   └── registry/         # ProviderRegistry (DI)
│           ├── sync/                 # BullMQ jobs & workers
│           ├── users/
│           └── webhooks/             # Webhook ingestion + idempotency
│
├── packages/
│   ├── database/                     # Prisma schema + generated client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── index.ts              # Re-exports PrismaClient
│   │
│   ├── shared/                       # Types, interfaces, utilities
│   │   └── src/
│   │       ├── adapters/             # FitnessProvider interface
│   │       ├── domain/               # Activity, Athlete, etc.
│   │       └── analytics/            # TSS formulas, zone calculators
│   │
│   └── ui/                           # Shared React components (charts, cards)
│
├── infra/
│   ├── docker-compose.yml            # Local dev: PG, Redis, API, Web
│   ├── docker-compose.prod.yml
│   └── nginx/
│
├── adrs/                             # Architectural Decision Records
│   ├── ADR-TEMPLATE.md
│   ├── ADR-001.md
│   └── ...
│
├── docs/                             # Detailed sub-documents
│   ├── AUTH_AND_TOKEN_MANAGEMENT.md
│   ├── SYNC_ENGINE.md
│   ├── ANALYTICS_COMPUTATION.md
│   ├── DATA_MODEL.md
│   ├── ADAPTER_DEVELOPMENT_GUIDE.md
│   └── INFRASTRUCTURE.md
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 6. Data Model (Prisma schema: key tables)

```prisma
model User {
  id          String        @id @default(cuid())
  email       String        @unique
  createdAt   DateTime      @default(now())
  deletedAt   DateTime?     // Soft delete for GDPR retention window
  connections Connection[]
  activities  Activity[]
}

model Connection {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // 'strava' | 'garmin'
  externalId   String   // athlete ID on the provider
  accessToken  String   // encrypted at rest (AES-256-GCM, envelope encryption)
  refreshToken String   // encrypted at rest
  expiresAt    DateTime
  lastSyncAt   DateTime?
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
}

model Activity {
  id                String    @id @default(cuid())
  userId            String
  source            String
  externalId        String
  type              String    // 'run' | 'ride' | 'swim' | ...
  name              String?
  startedAt         DateTime
  durationSeconds   Int
  distanceMeters    Float
  elevationGainM    Float?
  avgHeartRate      Int?
  maxHeartRate      Int?
  avgPaceSecPerKm   Float?
  avgWatts          Float?
  calories          Int?
  polyline          String?   // encoded Google polyline
  tss               Float?    // computed Training Stress Score
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Raw data stored in separate table (see ADR-010)
  rawPayload        ActivityRawPayload?

  @@unique([userId, source, externalId])
  @@index([userId, startedAt])           // TimescaleDB hypertable on startedAt
  @@index([userId, type, startedAt])     // Sport-filtered queries (e.g. "show only runs")
}

// Separated from Activity to avoid bloating the primary table (see ADR-010)
model ActivityRawPayload {
  activityId  String   @id
  payload     Json     // Full provider response for reprocessing
  createdAt   DateTime @default(now())
  activity    Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

// Pre-aggregated for fast dashboard queries
model DailyMetrics {
  userId           String
  date             DateTime  @db.Date
  totalDistanceM   Float     @default(0)
  totalDurationS   Int       @default(0)
  totalElevationM  Float     @default(0)
  totalTss         Float     @default(0)
  activityCount    Int       @default(0)
  updatedAt        DateTime  @updatedAt  // Track when recalculated

  @@id([userId, date])
}

// Webhook idempotency log (see ADR-013)
model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String   // 'strava'
  eventId     String   // Provider's event identifier
  eventType   String   // 'activity.create' | 'activity.update' | 'activity.delete'
  payload     Json
  processedAt DateTime?
  createdAt   DateTime @default(now())

  @@unique([provider, eventId])
  @@index([createdAt])  // For cleanup of old events
}
```

---

## 7. Strava Integration Details

### OAuth Flow
```
1. User clicks "Connect Strava"
2. Next.js redirects to Strava OAuth with scope: activity:read_all
3. Strava redirects back with code
4. Exchange code for access_token + refresh_token (NestJS endpoint)
5. Store encrypted tokens in Connection table (envelope encryption, see ADR-011)
6. Enqueue: bulk-import job for all historical activities
7. Register Strava Webhook subscription (one-time, per app)
```

### Webhook Events (Strava push model, preferred over polling)
```
POST /api/v1/webhooks/strava
Payload: { object_type: 'activity', aspect_type: 'create', object_id: 12345, owner_id: 67890 }
→ Validate subscription verify token
→ Check idempotency log (WebhookEvent table); skip if already processed
→ Store event in WebhookEvent table
→ Enqueue activity-sync job
→ Return 200 immediately (Strava requires <2s response)
```

### Supported Event Types
| Event | Action |
|-------|--------|
| `activity.create` | Fetch full activity, normalize, persist, recalculate DailyMetrics |
| `activity.update` | Re-fetch activity, update record, recalculate affected DailyMetrics |
| `activity.delete` | Soft-delete activity, recalculate affected DailyMetrics |
| `athlete.update` | Refresh athlete profile |
| `athlete.deauthorize` | Revoke connection, clean up tokens |

### Rate Limits
- 100 requests / 15 min per user token
- 1000 requests / day per user token
- Use webhook push to avoid polling; bulk import must be throttled via BullMQ rate limiter
- Track remaining quota from Strava response headers (`X-RateLimit-Limit`, `X-RateLimit-Usage`)

---

## 8. Observability & Error Handling

> Full details in [ADR-009](adrs/ADR-009.md)

| Layer | Tool | Purpose |
|-------|------|---------|
| **Structured Logging** | Pino (NestJS) | JSON logs with request ID, user ID, correlation ID |
| **Error Tracking** | Sentry | Exception capture with context, source maps for frontend |
| **Job Monitoring** | Bull Board | Dashboard for queue health, failed jobs, retry status |
| **Health Checks** | NestJS Terminus | `/health` endpoint: DB, Redis, queue connectivity |
| **Metrics (Phase 2+)** | Prometheus + Grafana | API latency, sync throughput, error rates |

### Error Handling Strategy
- **Global exception filter** in NestJS catches all unhandled errors, logs them with context, reports to Sentry
- **BullMQ workers** use exponential backoff: 3 retries with delays of 30s, 2min, 10min
- **Dead letter queue** captures permanently failed jobs for manual inspection
- **Token refresh failures** trigger a user notification and pause syncing (not a silent failure)
- **Strava rate limit hits** cause the job to be re-enqueued with a delay matching the rate limit window

---

## 9. API Versioning

> Full details in [ADR-012](adrs/ADR-012.md)

All API endpoints use URL prefix versioning: `/api/v1/...`

This is explicit, easy to understand, and cache-friendly. When breaking changes are needed, a `/api/v2/` prefix is introduced while `/v1/` continues to work during a deprecation window.

---

## 10. Infrastructure (Docker Compose: local dev)

```yaml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: fitness_analytics
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
      STRAVA_CLIENT_ID: ${STRAVA_CLIENT_ID}
      STRAVA_CLIENT_SECRET: ${STRAVA_CLIENT_SECRET}
      TOKEN_ENCRYPTION_KEY: ${TOKEN_ENCRYPTION_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
    ports: ["3001:3001"]

  web:
    build: ./apps/web
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
      NEXTAUTH_URL: http://localhost:3000
      SENTRY_DSN: ${SENTRY_DSN}
    ports: ["3000:3000"]

  bull-board:
    build: ./apps/api
    command: ["node", "dist/bull-board.js"]
    depends_on: [redis]
    ports: ["3002:3002"]
```

---

## 11. Analytics Computation Strategy

Two approaches, both used together:

### On-the-fly (for interactive filters)
- Simple queries: `SELECT time_bucket('1 week', started_at), SUM(distance_meters) FROM activities WHERE user_id = ? GROUP BY 1`
- Cache in Redis with 5-minute TTL, keyed by `analytics:{userId}:{queryHash}`

### Pre-aggregated (for dashboard cold load)
- `DailyMetrics` table is updated whenever a new activity is synced, updated, or deleted
- CTL/ATL/TSB are recalculated as a background job after each sync (exponential moving average)
- TimescaleDB Continuous Aggregates for weekly/monthly rollups

### DailyMetrics Recalculation
- On `activity.create`: increment metrics for the activity's date
- On `activity.update`: diff the old and new values, adjust the affected date's metrics
- On `activity.delete`: decrement metrics for the activity's date
- A full recalculation job can be triggered manually if data gets out of sync

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| OAuth token storage | AES-256-GCM with envelope encryption; see [ADR-011](adrs/ADR-011.md) |
| Key management | DEKs per-user, wrapped by a master KEK; rotation plan defined in ADR-011 |
| Token in transit | HTTPS only; tokens never in URL params |
| Strava webhook spoofing | Verify `hub.verify_token` on subscription; validate owner against known connections |
| API auth | Short-lived JWTs (15min) + refresh token rotation |
| User data isolation | All queries scoped by `userId` from JWT claims; no user can see another's data |
| Rate limiting | NestJS `@nestjs/throttler` on all endpoints |
| Data deletion | Soft delete with 30-day retention, then hard delete; see [ADR-014](adrs/ADR-014.md) |

---

## 13. Data Lifecycle & GDPR

> Full details in [ADR-014](adrs/ADR-014.md)

| Action | Behavior |
|--------|----------|
| **User disconnects a provider** | Revoke OAuth tokens, optionally keep or delete synced activities (user chooses) |
| **User deletes account** | Soft delete immediately; all data hard-deleted after 30-day grace period |
| **Data export** | User can request a full JSON export of all their data (GDPR Article 20) |
| **Provider sends deauthorize event** | Same as disconnect: revoke tokens, notify user |

---

## 14. Testing Strategy

> Full details in [ADR-015](adrs/ADR-015.md)

| Layer | Approach | Tools |
|-------|----------|-------|
| **Unit** | Domain logic, analytics formulas, normalization | Jest |
| **Integration** | API endpoints, database queries, BullMQ flows | Jest + Testcontainers (PG, Redis) |
| **Adapter** | Strava API interactions | Recorded HTTP fixtures (nock/msw) |
| **E2E** | Critical user flows (login, connect, view dashboard) | Playwright |
| **Contract** | Shared types haven't drifted | TypeScript strict mode + CI checks |

---

## 15. Phased Roadmap

### Phase 1: MVP (Strava only)
- [ ] Monorepo scaffold (Turborepo + pnpm)
- [ ] Observability setup (Pino, Sentry, Bull Board)
- [ ] Auth (login, Strava OAuth, JWT)
- [ ] Activity sync (bulk import + webhook with idempotency)
- [ ] Dashboard: weekly volume, activity calendar, sport distribution
- [ ] Activity log with basic stats
- [ ] Account settings: disconnect, data export, delete account

### Phase 2: Analytics Core
- [ ] Training load chart (CTL/ATL/TSB)
- [ ] Best efforts & PR progression
- [ ] Heart rate zone analysis
- [ ] Pace/power distribution
- [ ] Year-over-year comparison

### Phase 3: Geo & Routes
- [ ] Activity heatmap (Leaflet)
- [ ] Route clustering & most-run routes
- [ ] Elevation archives

### Phase 4: Multi-source
- [ ] Garmin Connect adapter
- [ ] Apple Health import (CSV/XML)
- [ ] Polar Flow adapter
- [ ] Deduplication logic (same activity from multiple sources)

### Phase 5: Intelligence
- [ ] Race time predictor
- [ ] Training plan builder
- [ ] Anomaly detection (unusual spikes)
- [ ] Weekly digest email

---

## 16. Summary of Recommendations

| Decision | Choice | Rationale | ADR |
|----------|--------|-----------|-----|
| Monorepo | Turborepo + pnpm | Fast builds, zero config, Vercel-native | [001](adrs/ADR-001.md) |
| Database | TimescaleDB (PG extension) | SQL familiarity + native time-series performance | [002](adrs/ADR-002.md) |
| ORM | Prisma | Type-safe, monorepo-friendly, great migrations | [003](adrs/ADR-003.md) |
| Jobs | BullMQ + Redis | Already need Redis; robust retry + rate limiting | [004](adrs/ADR-004.md) |
| Auth | Auth.js + NestJS JWT | Strava OAuth handled; stateless API | [005](adrs/ADR-005.md) |
| Adapter pattern | Interface + DI | Business logic never imports from `strava` | [006](adrs/ADR-006.md) |
| Data fetching | TanStack Query + Server Components | Best of both worlds: SSR + client interactivity | [007](adrs/ADR-007.md) |
| Charts | Recharts + D3 | Recharts for 90% of charts, D3 for custom | [008](adrs/ADR-008.md) |
| Observability | Pino + Sentry + Bull Board | Structured logs, error tracking, job visibility | [009](adrs/ADR-009.md) |
| Raw data storage | Separate table | Keeps Activity table lean, raw data available for reprocessing | [010](adrs/ADR-010.md) |
| Key management | Envelope encryption | Per-user DEKs, rotatable master KEK | [011](adrs/ADR-011.md) |
| API versioning | URL prefix (`/api/v1/`) | Explicit, cache-friendly, easy to understand | [012](adrs/ADR-012.md) |
| Webhook reliability | Idempotency log | At-least-once delivery with deduplication | [013](adrs/ADR-013.md) |
| Data lifecycle | Soft delete + 30-day retention | GDPR compliant, reversible mistakes | [014](adrs/ADR-014.md) |
| Testing | Jest + Testcontainers + Playwright | Coverage across all layers, realistic DB tests | [015](adrs/ADR-015.md) |
| Deployment (later) | Railway / Render / fly.io | Docker Compose → PaaS with minimal changes | TBD |

---

## 17. Detailed Documentation Index

For deeper dives, see the `/docs/` directory:

| Document | Scope |
|----------|-------|
| `AUTH_AND_TOKEN_MANAGEMENT.md` | Full OAuth flow, token encryption, refresh logic, session handling |
| `SYNC_ENGINE.md` | BullMQ job definitions, retry policies, rate limiting, idempotency |
| `ANALYTICS_COMPUTATION.md` | Formulas for CTL/ATL/TSB, DailyMetrics maintenance, cache invalidation |
| `DATA_MODEL.md` | Full Prisma schema, all indexes, TimescaleDB hypertable setup |
| `ADAPTER_DEVELOPMENT_GUIDE.md` | How to build a new adapter, interface contract, testing patterns |
| `INFRASTRUCTURE.md` | Docker setup, CI/CD, environments, monitoring, deployment |
