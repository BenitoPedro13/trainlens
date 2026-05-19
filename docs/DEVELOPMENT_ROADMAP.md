# TrainLens: Development Roadmap

> **Developer:** Solo
> **Approach:** Linear sprints, each ending with a working vertical slice
> **Rule:** No sprint starts until the previous one is demonstrably working
> **Estimated total:** 10-14 weeks (part-time adjustments will stretch this)

---

## How to Read This Document

Tasks are ordered by **dependency**, not by ADR number. Each sprint builds on the previous one. The "Definition of Done" for each sprint is a concrete, visible outcome you can verify.

The dependency graph looks like this:

```
Sprint 0: Skeleton
    │
    ▼
Sprint 1: Auth
    │
    ▼
Sprint 2: Strava Sync
    │
    ▼
Sprint 3: Dashboard MVP
    │
    ▼
Sprint 4: Analytics Engine
    │
    ▼
Sprint 5: Analytics UI
    │
    ▼
Sprint 6: Polish & Hardening
    │
    ▼
Sprint 7+: Expansion (geo, multi-source, intelligence)
```

---

## Sprint 0: Project Skeleton (~3-4 days)

**Goal:** A running monorepo with database, tests, logging, and CI. Zero features, but everything is wired.

**Why first:** Every future sprint depends on this foundation. Skipping tests or logging here means retrofitting them later, which is always harder and usually never happens.

| #    | Task                                             | Depends On | ADR | Notes                                                                                                  |
| ---- | ------------------------------------------------ | ---------- | --- | ------------------------------------------------------------------------------------------------------ |
| 0.1  | Initialize Turborepo + pnpm workspaces           | Nothing    | 001 | `npx create-turbo@latest`, configure `turbo.json` pipeline                                             |
| 0.2  | Create `apps/web` (Next.js 14, App Router)       | 0.1        | -   | Bare scaffold, one page that says "Hello"                                                              |
| 0.3  | Create `apps/api` (NestJS)                       | 0.1        | -   | Bare scaffold, one GET `/health` endpoint                                                              |
| 0.4  | Create `packages/shared`                         | 0.1        | -   | Export `FitnessProvider` interface and `Activity` domain types                                         |
| 0.5  | Create `packages/database` (Prisma)              | 0.1        | 003 | Initial schema: `User`, `Connection`, `Activity`, `DailyMetrics`, `WebhookEvent`, `ActivityRawPayload` |
| 0.6  | Docker Compose: PostgreSQL (TimescaleDB) + Redis | 0.1        | 002 | Verify `time_bucket()` works with a raw SQL test                                                       |
| 0.7  | Run Prisma migrations against Docker PG          | 0.5, 0.6   | 002 | Add raw migration to create hypertable on `Activity.startedAt`                                         |
| 0.8  | Wire Pino logger into NestJS                     | 0.3        | 009 | Structured JSON logs with request ID middleware                                                        |
| 0.9  | Jest setup with Testcontainers                   | 0.6        | 015 | One dummy integration test that connects to PG and runs a query                                        |
| 0.10 | CI pipeline (GitHub Actions)                     | 0.9        | 015 | Lint, type check (`tsc --noEmit`), unit tests, integration tests                                       |
| 0.11 | Create `packages/ui` placeholder                 | 0.1        | -   | Empty package, will hold shared chart components later                                                 |

**Definition of Done:**

- `pnpm dev` starts both web (port 3000) and api (port 3001)
- API `/health` returns `{ status: "ok", db: "connected", redis: "connected" }`
- CI pipeline passes on a push to main
- One integration test connects to a real Testcontainers PG and succeeds

---

## Sprint 1: Authentication (~4-5 days)

**Goal:** A user can sign up, log in, and connect their Strava account. Tokens are stored encrypted. The API validates JWTs.

**Why second:** Sync, dashboard, everything needs an authenticated user. You can't build anything useful without auth.

| #   | Task                                           | Depends On | ADR | Notes                                                                             |
| --- | ---------------------------------------------- | ---------- | --- | --------------------------------------------------------------------------------- |
| 1.1 | Auth.js setup in Next.js                       | Sprint 0   | 005 | Email/password provider first (for dev convenience), Strava provider added next   |
| 1.2 | Strava OAuth provider in Auth.js               | 1.1        | 005 | Configure `activity:read_all` scope, handle callback                              |
| 1.3 | Token encryption utility (envelope encryption) | Sprint 0   | 011 | `encrypt(plaintext, userId)` / `decrypt(ciphertext, userId)`, unit tested         |
| 1.4 | Store Strava tokens in `Connection` table      | 1.2, 1.3   | 011 | Encrypt access + refresh tokens before storage                                    |
| 1.5 | NestJS JWT guard                               | 1.1        | 005 | Validate Auth.js JWTs, extract `userId`, attach to request context                |
| 1.6 | Protected API route test                       | 1.5        | 015 | Integration test: request without token returns 401, with valid token returns 200 |
| 1.7 | Login/signup UI page                           | 1.1        | -   | Simple form, "Connect Strava" button                                              |
| 1.8 | Token refresh flow                             | 1.4        | 005 | When Strava access token expires, use refresh token automatically                 |

**Definition of Done:**

- You can log in, click "Connect Strava", complete the OAuth dance, and see your Strava athlete ID stored in the database
- Tokens in the `Connection` table are encrypted (verify by reading the raw DB value)
- API rejects requests without a valid JWT

**Tests written in this sprint:**

- Unit: encryption/decryption roundtrip
- Integration: JWT guard accepts/rejects tokens
- Integration: Connection record created after OAuth flow

---

## Sprint 2: Strava Sync Engine (~5-7 days)

**Goal:** After connecting Strava, all historical activities are imported. New activities arrive via webhook in near-real-time.

**Why third:** This is the data pipeline. Without data, there's nothing to show on a dashboard.

| #    | Task                                              | Depends On    | ADR      | Notes                                                                                    |
| ---- | ------------------------------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------- |
| 2.1  | BullMQ setup + queues                             | Sprint 0      | 004      | Create `activity-sync`, `bulk-import`, `webhook-ingest`, `analytics-recalc` queues       |
| 2.2  | Bull Board dashboard                              | 2.1           | 009      | Mount at `/admin/queues` (behind auth), verify queues are visible                        |
| 2.3  | Strava adapter: `getActivities()`                 | Sprint 1      | 006      | Paginate Strava `/athlete/activities`, respect rate limits                               |
| 2.4  | Strava adapter: `getActivityDetail()`             | Sprint 1      | 006      | Fetch single activity with streams/laps                                                  |
| 2.5  | Normalization layer                               | 2.3           | 006      | `StravaActivity` to canonical `Activity` mapping, unit tested thoroughly                 |
| 2.6  | Bulk import job                                   | 2.1, 2.3, 2.5 | 004      | BullMQ job: paginate all activities, normalize, persist. Rate-limited via BullMQ limiter |
| 2.7  | Trigger bulk import after OAuth connect           | 2.6, Sprint 1 | -        | After Strava OAuth success, enqueue bulk import job                                      |
| 2.8  | Webhook endpoint (`POST /api/v1/webhooks/strava`) | 2.1           | 012, 013 | Handle subscription verification + event ingestion                                       |
| 2.9  | Webhook idempotency layer                         | 2.8           | 013      | Store events in `WebhookEvent` table, skip duplicates                                    |
| 2.10 | Incremental sync job                              | 2.4, 2.5, 2.9 | 004      | Process webhook events: fetch activity, normalize, persist                               |
| 2.11 | Handle `activity.update` and `activity.delete`    | 2.10          | 013      | Update/soft-delete activities, recalculate affected DailyMetrics                         |
| 2.12 | Store raw payloads in `ActivityRawPayload`        | 2.5           | 010      | Save full Strava response alongside normalized data                                      |
| 2.13 | Error handling: token refresh in sync jobs        | 2.6, 2.10     | 009      | If 401 during sync, refresh token and retry; if refresh fails, pause sync and log        |
| 2.14 | Sentry integration                                | Sprint 0      | 009      | Wire into NestJS global filter and BullMQ worker error handler                           |

**Definition of Done:**

- Connect Strava, wait a few minutes, see all your historical activities in the database
- Create a new activity on Strava, see it appear in the database within 30 seconds (via webhook)
- Bull Board shows completed jobs and any failures
- Failed jobs have retried automatically with exponential backoff

**Tests written in this sprint:**

- Unit: normalization mapping (Strava types to canonical types, pace conversion, distance conversion)
- Adapter: recorded HTTP fixtures for Strava API responses (activity list, detail, 429 rate limit, 401 expired token)
- Integration: bulk import job processes a list of activities and persists them
- Integration: webhook idempotency skips duplicate events

---

## Sprint 3: Dashboard MVP (~4-5 days)

**Goal:** A logged-in user sees their data on a real dashboard. This is the first time the product looks like a product.

| #    | Task                                                  | Depends On | ADR | Notes                                                                             |
| ---- | ----------------------------------------------------- | ---------- | --- | --------------------------------------------------------------------------------- |
| 3.1  | API: `GET /api/v1/activities` (paginated, filterable) | Sprint 2   | 012 | Filter by sport type, date range. Scoped by userId                                |
| 3.2  | API: `GET /api/v1/activities/:id` (detail)            | Sprint 2   | 012 | Returns normalized activity with optional raw payload                             |
| 3.3  | API: `GET /api/v1/analytics/summary`                  | Sprint 2   | -   | Weekly volume, total distance, activity count, current streak                     |
| 3.4  | DailyMetrics computation                              | Sprint 2   | -   | Recalculate on activity create/update/delete (called from sync jobs)              |
| 3.5  | Redis caching layer for analytics endpoints           | 3.3        | 004 | 5-minute TTL, keyed by `analytics:{userId}:{queryHash}`, invalidated on sync      |
| 3.6  | Dashboard page (Next.js Server Component)             | 3.3, 3.4   | 007 | Weekly volume bar chart, activity count, current streak, sport distribution donut |
| 3.7  | Activity list page                                    | 3.1        | 007 | Paginated table/list with filters (sport, date) using TanStack Query              |
| 3.8  | Activity detail page                                  | 3.2        | 007 | Stats card, map with polyline (Leaflet), laps table                               |
| 3.9  | Activity heatmap calendar                             | 3.4        | 008 | GitHub-style contribution graph (D3)                                              |
| 3.10 | Navigation and layout shell                           | Sprint 1   | -   | Sidebar with links: Dashboard, Activities, Settings                               |

**Definition of Done:**

- Log in, see a dashboard with your real Strava data
- Weekly volume chart renders with actual numbers
- Activity heatmap calendar shows your training pattern
- Click an activity to see its detail page with stats and a map
- Filter activities by sport type and date range

**Tests written in this sprint:**

- Unit: DailyMetrics aggregation logic
- Integration: analytics summary endpoint returns correct totals
- Integration: cache invalidation works after new activity sync
- E2E (Playwright): login, see dashboard with data, click into activity detail

---

## Sprint 4: Analytics Engine (~5-6 days)

**Goal:** The analytics that differentiate this from "just another activity list." Training load, best efforts, zone analysis.

| #   | Task                                        | Depends On | ADR | Notes                                                                                |
| --- | ------------------------------------------- | ---------- | --- | ------------------------------------------------------------------------------------ |
| 4.1 | TSS (Training Stress Score) computation     | Sprint 3   | -   | Calculate per activity based on duration, HR, pace. Store on Activity record         |
| 4.2 | CTL / ATL / TSB calculation                 | 4.1        | -   | Exponential moving averages over DailyMetrics. Background job after each sync        |
| 4.3 | API: `GET /api/v1/analytics/training-load`  | 4.2        | -   | Returns time-series data for CTL, ATL, TSB                                           |
| 4.4 | API: `GET /api/v1/analytics/best-efforts`   | Sprint 3   | -   | Best times for standard distances (1K, 5K, 10K, half, marathon) over time            |
| 4.5 | API: `GET /api/v1/analytics/zones`          | Sprint 3   | -   | Heart rate zone distribution, pace zone distribution                                 |
| 4.6 | API: `GET /api/v1/analytics/year-over-year` | Sprint 3   | -   | Same week/month comparison across years                                              |
| 4.7 | Continuous aggregates (TimescaleDB)         | Sprint 3   | 002 | Weekly and monthly rollups on DailyMetrics for fast historical queries               |
| 4.8 | Backfill TSS for existing activities        | 4.1        | -   | One-time migration job: calculate TSS for all activities imported before this sprint |

**Definition of Done:**

- CTL/ATL/TSB values are computed and queryable via API
- Best efforts return your PRs across standard distances
- Zone distribution returns time-in-zone percentages
- Continuous aggregates are working (verify with `EXPLAIN ANALYZE` on a weekly rollup query)

**Tests written in this sprint:**

- Unit: TSS formula with known inputs/outputs
- Unit: CTL/ATL/TSB exponential moving average with a known 30-day dataset
- Unit: best effort extraction from activity streams
- Integration: training load endpoint returns expected shape after seeding activities

---

## Sprint 5: Analytics UI (~4-5 days)

**Goal:** All the analytics from Sprint 4 are now visible as beautiful charts.

| #   | Task                                   | Depends On | ADR | Notes                                                                |
| --- | -------------------------------------- | ---------- | --- | -------------------------------------------------------------------- |
| 5.1 | Training load page (CTL/ATL/TSB chart) | 4.3        | 008 | D3 custom multi-line chart with fitness/fatigue/form zones           |
| 5.2 | Best efforts page                      | 4.4        | 008 | Recharts line chart showing PR progression over time                 |
| 5.3 | Heart rate zones page                  | 4.5        | 008 | Recharts pie/bar chart for time-in-zone                              |
| 5.4 | Pace distribution histogram            | 4.5        | 008 | Recharts bar chart                                                   |
| 5.5 | Year-over-year comparison              | 4.6        | 008 | Recharts overlay chart (this year vs last year)                      |
| 5.6 | Date range picker (interactive)        | Sprint 3   | 007 | TanStack Query for client-side refetch on date change                |
| 5.7 | Sport type filter (interactive)        | Sprint 3   | 007 | Filter all analytics views by sport                                  |
| 5.8 | Streak and consistency cards           | Sprint 3   | -   | Current streak, longest streak, training monotony, rest day analysis |

**Definition of Done:**

- Training load page shows your fitness/fatigue/form curve
- Best efforts page shows your PR history across distances
- All charts respond to date range and sport type filters
- Charts load fast (cached analytics, no spinner > 1 second)

---

## Sprint 6: Settings, Data Lifecycle & Hardening (~3-4 days)

**Goal:** Users can manage their account, export data, disconnect providers, and delete their account. The app handles edge cases gracefully.

| #   | Task                                        | Depends On | ADR | Notes                                                                           |
| --- | ------------------------------------------- | ---------- | --- | ------------------------------------------------------------------------------- |
| 6.1 | Settings page UI                            | Sprint 3   | -   | Sections: connected providers, data export, danger zone (delete account)        |
| 6.2 | Disconnect provider flow                    | Sprint 2   | 014 | Revoke tokens, prompt keep/delete data, recalculate DailyMetrics if deleted     |
| 6.3 | Data export job                             | Sprint 2   | 014 | Background job generates JSON archive, available for download 24h               |
| 6.4 | Account deletion flow                       | Sprint 1   | 014 | Soft delete, revoke all connections, 30-day retention                           |
| 6.5 | Hard-delete cleanup job                     | 6.4        | 014 | Scheduled daily: find users where `deletedAt < now() - 30 days`, cascade delete |
| 6.6 | API rate limiting                           | Sprint 0   | -   | `@nestjs/throttler` on all endpoints                                            |
| 6.7 | Error boundary in Next.js                   | Sprint 3   | 009 | Graceful error pages instead of white screens                                   |
| 6.8 | Handle Strava `athlete.deauthorize` webhook | Sprint 2   | 014 | Same as disconnect, notify user                                                 |
| 6.9 | Sync status indicator in UI                 | Sprint 2   | -   | Show "syncing...", "last synced 5 min ago", "sync failed" in the dashboard      |

**Definition of Done:**

- Settings page lets you disconnect Strava (with keep/delete choice)
- Data export downloads a JSON file with all your activities
- Account deletion soft-deletes and logs you out
- Cleanup job hard-deletes after 30 days (test with a manually backdated record)
- Rate limiting returns 429 on excessive requests

---

## Sprint 7+: Expansion (ongoing, pick based on interest)

These sprints are independent of each other. Pick whichever excites you most or delivers the most value to users.

### Option A: Geo & Routes (5-6 days)

- Activity GPS heatmap (Leaflet + aggregated polylines)
- Most frequent routes (cluster by start/end proximity)
- Elevation profile per activity
- Explore radius visualization

### Option B: Multi-Source (7-10 days)

- Garmin Connect adapter (implement `FitnessProvider`)
- Apple Health import (CSV/XML file upload)
- Deduplication logic (same activity from Strava + Garmin)
- Provider selection UI in settings

### Option C: Intelligence (5-7 days)

- Race time predictor (Riegel formula + HR adjustment)
- Training plan adherence (set targets, track completion %)
- Anomaly detection (unusual load spikes)
- Milestone achievements (badges for 1000km, 100 activities, etc.)

### Option D: Weekly Digest (3-4 days)

- Email template with weekly summary (distance, TSS, CTL trend)
- Scheduled BullMQ job (weekly, Monday morning)
- Unsubscribe mechanism

---

## Task Dependency Map (Visual)

```
                    ┌──────────────────┐
                    │  Sprint 0        │
                    │  Skeleton        │
                    │  Monorepo, DB,   │
                    │  Docker, CI,     │
                    │  Tests, Logging  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 1        │
                    │  Authentication  │
                    │  Auth.js, JWT,   │
                    │  Strava OAuth,   │
                    │  Token Encryption│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 2        │
                    │  Sync Engine     │
                    │  BullMQ, Adapter,│
                    │  Webhooks,       │
                    │  Idempotency     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 3        │
                    │  Dashboard MVP   │
                    │  API endpoints,  │
                    │  Charts, List,   │
                    │  Detail pages    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐     │    ┌─────────▼────────┐
     │  Sprint 4      │     │    │  Sprint 6        │
     │  Analytics      │     │    │  Settings &      │
     │  Engine        │     │    │  Data Lifecycle   │
     └────────┬───────┘     │    └──────────────────┘
              │              │
     ┌────────▼───────┐     │
     │  Sprint 5      │     │
     │  Analytics UI  │     │
     └────────────────┘     │
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐  ┌─────▼──────┐
     │  Geo &     │  │  Multi-    │  │  Intelli-  │
     │  Routes    │  │  Source    │  │  gence     │
     └────────────┘  └────────────┘  └────────────┘
```

---

## Cross-Cutting Concerns (Every Sprint)

These are not standalone tasks. They happen alongside every sprint:

| Concern            | Rule                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| **Tests**          | Every feature gets tests in the same PR. No "I'll add tests later"        |
| **Logging**        | Every new service/controller uses Pino with structured context            |
| **Error handling** | Every new endpoint has proper error responses; every job has retry logic  |
| **Types**          | All new domain types go in `packages/shared`; no inline types in app code |
| **CI**             | Pipeline must pass before merging. If a test is flaky, fix it immediately |

---

## Time Estimates (Solo Developer)

| Sprint                         | Estimated Days | Cumulative |
| ------------------------------ | -------------- | ---------- |
| Sprint 0: Skeleton             | 3-4            | 3-4 days   |
| Sprint 1: Auth                 | 4-5            | 7-9 days   |
| Sprint 2: Sync Engine          | 5-7            | 12-16 days |
| Sprint 3: Dashboard MVP        | 4-5            | 16-21 days |
| Sprint 4: Analytics Engine     | 5-6            | 21-27 days |
| Sprint 5: Analytics UI         | 4-5            | 25-32 days |
| Sprint 6: Settings & Lifecycle | 3-4            | 28-36 days |

**Working full-time:** ~6-7 weeks to a feature-complete MVP
**Working part-time (evenings/weekends):** ~10-14 weeks

---

## Milestones Worth Celebrating

| After Sprint | You Have                                                                |
| ------------ | ----------------------------------------------------------------------- |
| 0            | A running monorepo with CI. Boring but essential                        |
| 1            | "I can log in and connect Strava!"                                      |
| 2            | "My activities are syncing automatically!" (this is the hardest sprint) |
| 3            | **"This looks like a real product."** (show people here, get feedback)  |
| 5            | "This shows me things Strava doesn't." (the differentiation point)      |
| 6            | "I'd feel comfortable if other people used this."                       |
