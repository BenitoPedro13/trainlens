# TrainLens: Development Roadmap

> **Developer:** Solo
> **Approach:** Linear sprints, each ending with a working vertical slice
> **Rule:** No sprint starts until the previous one is demonstrably working
> **Estimated total:** 22-30 weeks for full feature parity with Strava Premium (part-time)

---

## How to Read This Document

Tasks are ordered by **dependency**, not by ADR number. Each sprint builds on the previous one. The "Definition of Done" for each sprint is a concrete, visible outcome you can verify.

The roadmap is split into two halves:

- **Sprints 0-6: MVP** — the platform is shippable. You can self-host it for yourself and a few friends. Strava sync, dashboard, core analytics, settings.
- **Sprints 7-11: Feature Parity** — segments, goals, spatial intelligence, AI insights, training plans. This is what closes the gap with Strava Premium.

Sprint 6 (Settings & Lifecycle) is the **earliest you can responsibly ship**, because it includes account deletion, data export, and rate limiting. Everything after that is feature expansion against a stable foundation.

```
═══════════════════════════════════ MVP ═══════════════════════════════════
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
Sprint 4: Analytics Engine (CTL/ATL/TSB, zones, estimated power)
    │
    ▼
Sprint 5: Analytics UI
    │
    ▼
Sprint 6: Settings & Data Lifecycle          ← MVP SHIPPABLE HERE
    │
═════════════════════════════ FEATURE PARITY ═════════════════════════════
    │
    ▼
Sprint 7: Segments (sync, analysis, leaderboards)
    │
    ▼
Sprint 8: Custom Goals & Targets
    │
    ▼
Sprint 9: Spatial Intelligence (PostGIS, personal heatmap, matched runs)
    │
    ▼
Sprint 10: AI Workout Insights
    │
    ▼
Sprint 11: Training Plans
    │
═══════════════════════════════ EXPANSION ════════════════════════════════
    │
    ▼
Sprint 12+: Multi-source (Garmin, Apple Health), route builder, watch export
```

---

## Sprint 0: Project Skeleton (~3-4 days)

**Goal:** A running monorepo with database, tests, logging, and CI. Zero features, but everything is wired.

**Why first:** Every future sprint depends on this foundation. Skipping tests or logging here means retrofitting them later, which is always harder and usually never happens.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 0.1 | Initialize Turborepo + pnpm workspaces | Nothing | 001 | `npx create-turbo@latest`, configure `turbo.json` pipeline |
| 0.2 | Create `apps/web` (Next.js 14, App Router) | 0.1 | - | Bare scaffold, one page that says "Hello" |
| 0.3 | Create `apps/api` (NestJS) | 0.1 | - | Bare scaffold, one GET `/health` endpoint |
| 0.4 | Create `packages/shared` | 0.1 | - | Export `FitnessProvider` interface and `Activity` domain types |
| 0.5 | Create `packages/database` (Prisma) | 0.1 | 003 | Initial schema: `User`, `Connection`, `Activity`, `DailyMetrics`, `WebhookEvent`, `ActivityRawPayload` |
| 0.6 | Docker Compose: PostgreSQL (TimescaleDB + PostGIS) + Redis | 0.1 | 002, 016 | Use `timescale/timescaledb-ha:pg16` (includes PostGIS); verify `time_bucket()` and `ST_Distance` both work |
| 0.7 | Run Prisma migrations against Docker PG | 0.5, 0.6 | 002 | Add raw migration to create hypertable on `Activity.startedAt` |
| 0.8 | Wire Pino logger into NestJS | 0.3 | 009 | Structured JSON logs with request ID middleware |
| 0.9 | Jest setup with Testcontainers | 0.6 | 015 | One dummy integration test that connects to PG and runs a query |
| 0.10 | CI pipeline (GitHub Actions) | 0.9 | 015 | Lint, type check (`tsc --noEmit`), unit tests, integration tests |
| 0.11 | Create `packages/ui` placeholder | 0.1 | - | Empty package, will hold shared chart components later |

**Definition of Done:**
- `pnpm dev` starts both web (port 3000) and api (port 3001)
- API `/health` returns `{ status: "ok", db: "connected", redis: "connected" }`
- CI pipeline passes on a push to main
- One integration test connects to a real Testcontainers PG and succeeds
- Both TimescaleDB and PostGIS extensions are confirmed working in the dev DB

---

## Sprint 1: Authentication (~4-5 days)

**Goal:** A user can sign up, log in, and connect their Strava account. Tokens are stored encrypted. The API validates JWTs.

**Why second:** Sync, dashboard, everything needs an authenticated user. You can't build anything useful without auth.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 1.1 | Auth.js setup in Next.js | Sprint 0 | 005 | Email/password provider first (for dev convenience), Strava provider added next |
| 1.2 | Strava OAuth provider in Auth.js | 1.1 | 005 | Configure `activity:read_all` scope, handle callback |
| 1.3 | Token encryption utility (envelope encryption) | Sprint 0 | 011 | `encrypt(plaintext, userId)` / `decrypt(ciphertext, userId)`, unit tested |
| 1.4 | Store Strava tokens in `Connection` table | 1.2, 1.3 | 011 | Encrypt access + refresh tokens before storage |
| 1.5 | NestJS JWT guard | 1.1 | 005 | Validate Auth.js JWTs, extract `userId`, attach to request context |
| 1.6 | Protected API route test | 1.5 | 015 | Integration test: request without token returns 401, with valid token returns 200 |
| 1.7 | Login/signup UI page | 1.1 | - | Simple form, "Connect Strava" button |
| 1.8 | Token refresh flow | 1.4 | 005 | When Strava access token expires, use refresh token automatically |

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

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 2.1 | BullMQ setup + queues | Sprint 0 | 004 | Create `activity-sync`, `bulk-import`, `webhook-ingest`, `analytics-recalc` queues |
| 2.2 | Bull Board dashboard | 2.1 | 009 | Mount at `/admin/queues` (behind auth), verify queues are visible |
| 2.3 | Strava adapter: `getActivities()` | Sprint 1 | 006 | Paginate Strava `/athlete/activities`, respect rate limits |
| 2.4 | Strava adapter: `getActivityDetail()` | Sprint 1 | 006 | Fetch single activity with streams/laps |
| 2.5 | Normalization layer | 2.3 | 006 | `StravaActivity` to canonical `Activity` mapping, unit tested thoroughly |
| 2.6 | Bulk import job | 2.1, 2.3, 2.5 | 004 | BullMQ job: paginate all activities, normalize, persist. Rate-limited via BullMQ limiter |
| 2.7 | Trigger bulk import after OAuth connect | 2.6, Sprint 1 | - | After Strava OAuth success, enqueue bulk import job |
| 2.8 | Webhook endpoint (`POST /api/v1/webhooks/strava`) | 2.1 | 012, 013 | Handle subscription verification + event ingestion |
| 2.9 | Webhook idempotency layer | 2.8 | 013 | Store events in `WebhookEvent` table, skip duplicates |
| 2.10 | Incremental sync job | 2.4, 2.5, 2.9 | 004 | Process webhook events: fetch activity, normalize, persist |
| 2.11 | Handle `activity.update` and `activity.delete` | 2.10 | 013 | Update/soft-delete activities, recalculate affected DailyMetrics |
| 2.12 | Store raw payloads in `ActivityRawPayload` | 2.5 | 010 | Save full Strava response alongside normalized data |
| 2.13 | Error handling: token refresh in sync jobs | 2.6, 2.10 | 009 | If 401 during sync, refresh token and retry; if refresh fails, pause sync and log |
| 2.14 | Sentry integration | Sprint 0 | 009 | Wire into NestJS global filter and BullMQ worker error handler |

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

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 3.1 | API: `GET /api/v1/activities` (paginated, filterable) | Sprint 2 | 012 | Filter by sport type, date range. Scoped by userId |
| 3.2 | API: `GET /api/v1/activities/:id` (detail) | Sprint 2 | 012 | Returns normalized activity with optional raw payload |
| 3.3 | API: `GET /api/v1/analytics/summary` | Sprint 2 | - | Weekly volume, total distance, activity count, current streak |
| 3.4 | DailyMetrics computation | Sprint 2 | - | Recalculate on activity create/update/delete (called from sync jobs) |
| 3.5 | Redis caching layer for analytics endpoints | 3.3 | 004 | 5-minute TTL, keyed by `analytics:{userId}:{queryHash}`, invalidated on sync |
| 3.6 | Dashboard page (Next.js Server Component) | 3.3, 3.4 | 007 | Weekly volume bar chart, activity count, current streak, sport distribution donut |
| 3.7 | Activity list page | 3.1 | 007 | Paginated table/list with filters (sport, date) using TanStack Query |
| 3.8 | Activity detail page | 3.2 | 007 | Stats card, map with polyline (Leaflet), laps table |
| 3.9 | Activity heatmap calendar | 3.4 | 008 | GitHub-style contribution graph (D3) |
| 3.10 | Navigation and layout shell | Sprint 1 | - | Sidebar with links: Dashboard, Activities, Settings |

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

## Sprint 4: Analytics Engine (~6-7 days)

**Goal:** The analytics that differentiate this from "just another activity list." Training load, best efforts, zone analysis, estimated power.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 4.1 | TSS (Training Stress Score) computation | Sprint 3 | - | Calculate per activity based on duration, HR, pace. Store on Activity record |
| 4.2 | CTL / ATL / TSB calculation | 4.1 | - | Exponential moving averages over DailyMetrics. Background job after each sync |
| 4.3 | API: `GET /api/v1/analytics/training-load` | 4.2 | - | Returns time-series data for CTL, ATL, TSB |
| 4.4 | API: `GET /api/v1/analytics/best-efforts` | Sprint 3 | - | Best times for standard distances (1K, 5K, 10K, half, marathon) over time |
| 4.5 | API: `GET /api/v1/analytics/zones` | Sprint 3 | - | Heart rate zone distribution, pace zone distribution |
| 4.6 | API: `GET /api/v1/analytics/year-over-year` | Sprint 3 | - | Same week/month comparison across years |
| 4.7 | Continuous aggregates (TimescaleDB) | Sprint 3 | 002 | Weekly and monthly rollups on DailyMetrics for fast historical queries |
| 4.8 | Backfill TSS for existing activities | 4.1 | - | One-time migration job: calculate TSS for all activities imported before this sprint |
| 4.9 | **Estimated power for running** | 4.1 | - | Compute from pace + grade + weight (Minetti's formula or similar). No hardware required. |
| 4.10 | **Estimated power for cycling** | 4.1 | - | Use existing power data if available; otherwise estimate from speed + grade + weight + drag coefficient |
| 4.11 | Training monotony & acute:chronic ratio | 4.2 | - | Both derived from existing daily TSS; surface as alerts when out of safe range |

**Definition of Done:**
- CTL/ATL/TSB values are computed and queryable via API
- Best efforts return your PRs across standard distances
- Zone distribution returns time-in-zone percentages
- Continuous aggregates are working (verify with `EXPLAIN ANALYZE` on a weekly rollup query)
- Estimated power values exist on activities without power meters

**Tests written in this sprint:**
- Unit: TSS formula with known inputs/outputs
- Unit: CTL/ATL/TSB exponential moving average with a known 30-day dataset
- Unit: best effort extraction from activity streams
- Unit: estimated power against published reference values
- Integration: training load endpoint returns expected shape after seeding activities

---

## Sprint 5: Analytics UI (~4-5 days)

**Goal:** All the analytics from Sprint 4 are now visible as beautiful charts.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 5.1 | Training load page (CTL/ATL/TSB chart) | 4.3 | 008 | D3 custom multi-line chart with fitness/fatigue/form zones |
| 5.2 | Best efforts page | 4.4 | 008 | Recharts line chart showing PR progression over time |
| 5.3 | Heart rate zones page | 4.5 | 008 | Recharts pie/bar chart for time-in-zone |
| 5.4 | Pace distribution histogram | 4.5 | 008 | Recharts bar chart |
| 5.5 | Year-over-year comparison | 4.6 | 008 | Recharts overlay chart (this year vs last year) |
| 5.6 | Date range picker (interactive) | Sprint 3 | 007 | TanStack Query for client-side refetch on date change |
| 5.7 | Sport type filter (interactive) | Sprint 3 | 007 | Filter all analytics views by sport |
| 5.8 | Streak and consistency cards | Sprint 3 | - | Current streak, longest streak, training monotony, rest day analysis |
| 5.9 | Power display on activity detail page | 4.9, 4.10 | 008 | Show real power if available, estimated power otherwise (with a clear label) |

**Definition of Done:**
- Training load page shows your fitness/fatigue/form curve
- Best efforts page shows your PR history across distances
- All charts respond to date range and sport type filters
- Charts load fast (cached analytics, no spinner > 1 second)

---

## Sprint 6: Settings, Data Lifecycle & Hardening (~3-4 days)

**Goal:** Users can manage their account, export data, disconnect providers, and delete their account. The app handles edge cases gracefully.

**This is the earliest sprint after which TrainLens is shippable.** Everything that follows is feature expansion against a stable, accountable foundation.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 6.1 | Settings page UI | Sprint 3 | - | Sections: connected providers, data export, danger zone (delete account) |
| 6.2 | Disconnect provider flow | Sprint 2 | 014 | Revoke tokens, prompt keep/delete data, recalculate DailyMetrics if deleted |
| 6.3 | Data export job | Sprint 2 | 014 | Background job generates JSON archive, available for download 24h |
| 6.4 | Account deletion flow | Sprint 1 | 014 | Soft delete, revoke all connections, 30-day retention |
| 6.5 | Hard-delete cleanup job | 6.4 | 014 | Scheduled daily: find users where `deletedAt < now() - 30 days`, cascade delete |
| 6.6 | API rate limiting | Sprint 0 | - | `@nestjs/throttler` on all endpoints |
| 6.7 | Error boundary in Next.js | Sprint 3 | 009 | Graceful error pages instead of white screens |
| 6.8 | Handle Strava `athlete.deauthorize` webhook | Sprint 2 | 014 | Same as disconnect, notify user |
| 6.9 | Sync status indicator in UI | Sprint 2 | - | Show "syncing...", "last synced 5 min ago", "sync failed" in the dashboard |

**Definition of Done:**
- Settings page lets you disconnect Strava (with keep/delete choice)
- Data export downloads a JSON file with all your activities
- Account deletion soft-deletes and logs you out
- Cleanup job hard-deletes after 30 days (test with a manually backdated record)
- Rate limiting returns 429 on excessive requests
- **MVP is now shippable.** Take a breath, get feedback, then keep going.

---

## Sprint 7: Segments (~6-8 days)

**Goal:** Segments become first-class entities. Users can see their segment history, personal progression, and filtered leaderboards.

**Why this first after MVP:** Segments are deeply integrated with how Strava users think about training. Most other premium features (goals on segments, training plans referencing segments) depend on this data being in place.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 7.1 | Segment + SegmentEffort schema | Sprint 6 | 017 | Add tables via Prisma migration; spatial columns via raw SQL |
| 7.2 | Extract segment efforts during activity detail sync | Sprint 2 | 017 | Strava's activity detail response includes `segment_efforts`; upsert segments and inserts efforts |
| 7.3 | Backfill segments from existing activities | 7.1, 7.2 | 017 | One-time job: re-process all `ActivityRawPayload` to extract segment data |
| 7.4 | Segment metadata fetcher (lazy) | 7.1 | 017 | When a segment is first encountered without full metadata, enqueue a low-priority fetch to `/segments/{id}` |
| 7.5 | API: `GET /api/v1/segments/:id` | 7.4 | 012 | Segment details with the user's personal efforts |
| 7.6 | API: `GET /api/v1/segments/:id/efforts` | 7.2 | 012 | All of the user's efforts on this segment, sorted by time |
| 7.7 | API: `GET /api/v1/segments/:id/leaderboard` | 7.5 | 017 | Fetch from Strava, cache 1 hour; supports filtered params (age, gender, weight) |
| 7.8 | Segment detail page UI | 7.5, 7.6 | 008 | Map of segment, leaderboard table, your effort progression chart |
| 7.9 | Segment list page | 7.6 | - | All segments the user has efforts on, sortable by attempts, best time, recency |
| 7.10 | "Matched efforts" side-by-side comparison | 7.6 | - | Pick two efforts on the same segment, see splits/HR/power side by side |

**Definition of Done:**
- Every activity's segment efforts are visible
- Click a segment to see your full history of efforts on it, plotted over time
- Filtered leaderboards work (e.g., "show me top 10 in my age group")
- Comparing two efforts on the same segment shows their differences

**Tests written in this sprint:**
- Unit: segment effort extraction from raw Strava payload
- Adapter: recorded fixtures for `/segments/:id` and `/segments/:id/leaderboard`
- Integration: segment efforts persisted with proper indexes
- Integration: leaderboard cache TTL behavior

---

## Sprint 8: Goals & Targets (~4-5 days)

**Goal:** Users can set custom goals (weekly mileage, yearly distance, segment PRs, race times) and see live progress.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 8.1 | Goal + GoalProgress schema | Sprint 7 | 019 | Goals can reference segments (depends on Sprint 7) |
| 8.2 | Goal creation API + UI | 8.1 | 019 | Type, target, period, sport filter; segment picker for SEGMENT_TIME goals |
| 8.3 | Progress computation engine | 8.1 | 019 | Incremental update on every activity sync; reuses DailyMetrics |
| 8.4 | Pace status calculator | 8.3 | 019 | `ahead | on-track | behind | at-risk` based on time-in-period vs progress |
| 8.5 | Daily rollover job | 8.3 | 019 | Per-user timezone-aware midnight job: close expired goals, auto-create rollovers |
| 8.6 | Goals dashboard widget | 8.4 | 008 | Top 3 active goals with progress bars on the main dashboard |
| 8.7 | `/goals` page | 8.4 | 008 | Full list, history, sparkline of progress vs ideal pace |
| 8.8 | User timezone support | 8.5 | - | Add `User.timezone`; offer to detect on first login |

**Definition of Done:**
- Create a goal "Run 50km this week," see live progress as activities sync
- Pace status updates correctly throughout the period
- Expired goals auto-close with COMPLETED or FAILED status
- Goals appear on the dashboard and have their own page

**Tests written in this sprint:**
- Unit: pace status calculation across all goal types
- Integration: goal progress updates after activity sync
- Integration: rollover job correctly closes and re-creates recurring goals

---

## Sprint 9: Spatial Intelligence (~7-9 days)

**Goal:** Personal heatmap and matched runs. The features that make people say "wait, you can do that?"

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 9.1 | Verify PostGIS in production-target environment | Sprint 0 | 016 | Confirm chosen hosting provider supports the extension |
| 9.2 | Activity.route geography column + GIST index | Sprint 2 | 016 | Raw SQL migration; populate from existing polylines |
| 9.3 | RouteFingerprint table + algorithm | 9.2 | 016 | On sync: simplify polyline, compute hash, store fingerprint |
| 9.4 | Backfill fingerprints for existing activities | 9.3 | - | Background job; can take a while for users with thousands of activities |
| 9.5 | Matched runs API | 9.3 | - | `GET /api/v1/activities/:id/matched`: find similar routes using hash bucket + ST_HausdorffDistance |
| 9.6 | Matched runs UI on activity detail page | 9.5 | 008 | "You've run this route 12 times" with comparison chart |
| 9.7 | UserHeatmapTile schema + computation | 9.2 | 016 | On sync: compute tiles at zoom levels 10-15 for each GPS point |
| 9.8 | Tile server endpoint | 9.7 | 012 | `GET /api/v1/heatmap/:z/:x/:y`: returns tile data for the authenticated user |
| 9.9 | Personal heatmap page | 9.8 | 008 | Leaflet map with custom tile layer rendering the user's heatmap |
| 9.10 | Route clustering API | 9.3 | - | Group activities by start/end proximity; "your top 10 most-run routes" |
| 9.11 | Explore radius widget | 9.7 | 008 | Bounding region of typical training area on the dashboard |

**Definition of Done:**
- Personal heatmap shows every road and trail you've ever covered
- Opening an activity shows "you've done this route N times" with side-by-side comparison
- Top routes page lists your most-frequented loops
- All spatial queries return in <1 second for a user with 1000+ activities

**Tests written in this sprint:**
- Unit: polyline simplification + fingerprint generation
- Integration: matched runs returns expected pairs against seeded similar activities
- Integration: heatmap tile counts are correct after activity sync
- Performance: query benchmarks on 10K-activity synthetic dataset

---

## Sprint 10: AI Workout Insights (~5-6 days)

**Goal:** Every workout gets a thoughtful natural-language summary, grounded in actual training data.

**Provider decision:** Defer per ADR-018. Build the abstraction first, then choose Anthropic or OpenAI based on cost/quality testing.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 10.1 | `InsightsProvider` interface in `packages/shared` | Sprint 4 | 018 | Mirror of `FitnessProvider` pattern |
| 10.2 | Prompt design + structured input/output schema | 10.1 | 018 | Zod schema for `ActivityInsightInput` and `ActivityInsight`; enforced via tool calls |
| 10.3 | Implement provider against Anthropic OR OpenAI | 10.2 | 018 | Pick one to start; the abstraction lets us add the other later |
| 10.4 | ActivityInsight schema + persistence | 10.1 | 018 | Insights cached forever, keyed by activityId |
| 10.5 | `insights-generation` BullMQ queue | 10.3 | 004 | Low priority; rate-limited; budget alerts |
| 10.6 | On-view trigger: enqueue if missing | 10.4 | 018 | When activity detail page loads and no insight exists, enqueue + show "generating" state |
| 10.7 | SSE endpoint for live insight delivery | 10.5 | - | Push generated insight to the activity detail page when ready |
| 10.8 | Activity insight UI block | 10.7 | 008 | Headline + body + highlights + optional suggestion |
| 10.9 | Cost & budget monitoring | 10.5 | 018 | Daily cost rollup; Sentry alert if monthly budget exceeded; auto-pause queue if hit |
| 10.10 | Number-validation safeguard | 10.3 | 018 | Reject any insight where a cited number doesn't appear in the input (anti-hallucination) |

**Definition of Done:**
- Open any activity, see an AI-generated insight within a few seconds
- Insights cite real numbers from the workout and recent training context
- Cost is tracked per insight; total monthly spend is visible
- Hallucination guard catches and rejects insights with invented numbers
- Provider can be swapped via configuration (test by implementing the second provider behind the same interface)

**Tests written in this sprint:**
- Unit: prompt assembly from `ActivityInsightInput`
- Unit: output schema validation; rejection of malformed responses
- Unit: number-validation against input
- Integration: end-to-end generation flow with a stubbed provider

---

## Sprint 11: Training Plans (~8-10 days)

**Goal:** Users enroll in a plan, see scheduled workouts on a calendar, and watch adherence track itself as activities sync.

| # | Task | Depends On | ADR | Notes |
|---|------|------------|-----|-------|
| 11.1 | Plan template schema | Sprint 6 | 020 | PlanTemplate, PlanWeekTemplate, PlanWorkoutTemplate |
| 11.2 | UserPlan + PlannedWorkout schema | 11.1 | 020 | Per-user plan instances with concrete scheduled workouts |
| 11.3 | Seed 8 starter templates via Prisma migration | 11.1 | 020 | 5K Beginner, 5K Improver, 10K Build, Half Marathon (2 levels), Marathon Beginner, Base Building, Cycling FTP Build |
| 11.4 | Plan enrollment flow | 11.2 | 020 | Pick template, choose start date or target event date, instantiate workouts |
| 11.5 | Adherence matcher | Sprint 4, 11.2 | 020 | On activity sync: find candidate planned workouts, score, attach if confidence > 0.6 |
| 11.6 | Reschedule / skip / swap API + UI | 11.2 | 020 | Drag-and-drop calendar or modal-based reschedule |
| 11.7 | Manual link API + UI | 11.5 | 020 | Let user override the matcher; learn from the override over time |
| 11.8 | Plan dashboard page | 11.5 | 008 | This week's workouts, completion rate, pace trend, days to target event |
| 11.9 | Calendar view of upcoming workouts | 11.2 | 008 | Month/week view with workouts color-coded by type |
| 11.10 | Adherence score calculation | 11.5 | 020 | 0-1 score based on date, type, duration, and target match |
| 11.11 | Plan abandonment flow | 11.2 | 020 | Mark UserPlan ABANDONED; remaining workouts stop matching |

**Definition of Done:**
- Enroll in a 12-week half marathon plan starting next Monday
- See all 12 weeks of workouts on the calendar
- As you log activities, planned workouts get auto-matched and marked complete
- The plan dashboard shows your adherence percentage, trending pace on tempo runs, and days to the goal date
- You can reschedule a long run from Saturday to Sunday with one drag

**Tests written in this sprint:**
- Unit: adherence scoring across all combinations of date/type/duration mismatches
- Integration: matcher correctly pairs activities with planned workouts
- Integration: rescheduling preserves audit trail
- E2E: enroll, sync activities, see adherence update

---

## Sprint 12+: Expansion (ongoing, pick based on interest)

These are independent of each other. Pick whichever delivers the most value or excites you most.

### Option A: Multi-Source (7-10 days)
- Garmin Connect adapter (implement `FitnessProvider`)
- Apple Health import (CSV/XML file upload)
- Polar Flow adapter
- Deduplication logic (same activity from Strava + Garmin)

### Option B: Route Builder (5-7 days)
- Pinpoint-based custom route creation
- Distance/elevation/surface filters
- AI-suggested routes from a starting point (uses your personal heatmap + community heatmap if available)
- Export to GPX/TCX/FIT for watch sync

### Option C: Watch Export (3-4 days)
- Generate FIT files from planned workouts
- Send to Garmin Connect (if Garmin adapter is built)
- Allow GPX download for any planned route

### Option D: Weekly Digest (3-4 days)
- Email template with weekly summary (distance, TSS, CTL trend, top workout)
- Scheduled BullMQ job (weekly, Monday morning per user timezone)
- AI-generated narrative summary (reuses Sprint 10 infrastructure)
- Unsubscribe mechanism

### Option E: Public Profile (4-5 days)
- Opt-in public athlete pages
- Shareable achievement cards (post to social)
- Privacy controls per data type (show distance but hide pace, etc.)

---

## Task Dependency Map (Visual)

```
                    ┌──────────────────┐
                    │  Sprint 0        │
                    │  Skeleton        │
                    │  Monorepo, DB,   │
                    │  Docker, CI,     │
                    │  Tests, Logging  │
                    │  PostGIS+Timesc. │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 1        │
                    │  Authentication  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 2        │
                    │  Sync Engine     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 3        │
                    │  Dashboard MVP   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 4        │
                    │  Analytics       │
                    │  Engine          │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 5        │
                    │  Analytics UI    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 6        │
                    │  Settings &      │
                    │  Lifecycle       │ ← MVP SHIPPABLE
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 7        │
                    │  Segments        │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 8        │
                    │  Goals           │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 9        │
                    │  Spatial Intel.  │
                    │  Heatmap+Matched │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 10       │
                    │  AI Insights     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sprint 11       │
                    │  Training Plans  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼────────────────┐
              │              │                │
     ┌────────▼──────┐ ┌─────▼─────┐ ┌────────▼────────┐
     │ Multi-source  │ │ Route     │ │ Watch Export    │
     │ (Garmin etc.) │ │ Builder   │ │ (GPX/FIT)       │
     └───────────────┘ └───────────┘ └─────────────────┘
```

---

## Cross-Cutting Concerns (Every Sprint)

These are not standalone tasks. They happen alongside every sprint:

| Concern | Rule |
|---------|------|
| **Tests** | Every feature gets tests in the same PR. No "I'll add tests later" |
| **Logging** | Every new service/controller uses Pino with structured context |
| **Error handling** | Every new endpoint has proper error responses; every job has retry logic |
| **Types** | All new domain types go in `packages/shared`; no inline types in app code |
| **CI** | Pipeline must pass before merging. If a test is flaky, fix it immediately |
| **ADR discipline** | If a decision affects multiple modules, write an ADR. Don't let architectural decisions live only in code |

---

## Time Estimates (Solo Developer)

### MVP (Sprints 0-6)

| Sprint | Estimated Days | Cumulative |
|--------|---------------|------------|
| 0: Skeleton | 3-4 | 3-4 days |
| 1: Auth | 4-5 | 7-9 days |
| 2: Sync Engine | 5-7 | 12-16 days |
| 3: Dashboard MVP | 4-5 | 16-21 days |
| 4: Analytics Engine | 6-7 | 22-28 days |
| 5: Analytics UI | 4-5 | 26-33 days |
| 6: Settings & Lifecycle | 3-4 | 29-37 days |

**Full-time:** ~6-8 weeks. **Part-time (evenings/weekends):** ~10-14 weeks.

### Feature Parity (Sprints 7-11)

| Sprint | Estimated Days | Cumulative (added to MVP) |
|--------|---------------|---------------------------|
| 7: Segments | 6-8 | 35-45 days |
| 8: Goals | 4-5 | 39-50 days |
| 9: Spatial Intelligence | 7-9 | 46-59 days |
| 10: AI Insights | 5-6 | 51-65 days |
| 11: Training Plans | 8-10 | 59-75 days |

**Full-time:** ~12-15 weeks total from start. **Part-time:** ~22-30 weeks.

---

## Milestones Worth Celebrating

| After Sprint | You Have |
|-------------|---------|
| 0 | A running monorepo with CI. Boring but essential |
| 1 | "I can log in and connect Strava!" |
| 2 | "My activities are syncing automatically!" (the hardest sprint) |
| 3 | **"This looks like a real product."** Show people here, get feedback |
| 5 | "This shows me things Strava doesn't." |
| 6 | **"I'd feel comfortable if other people used this."** MVP shipped |
| 7 | "I can analyze my segments in ways Strava charges for." |
| 8 | "I'm tracking goals and the platform tells me when I'm off pace." |
| 9 | "Wait, you can show me every trail I've ever covered?" The wow moment |
| 10 | "The AI summaries actually understand my training." |
| 11 | **"This is my training platform, not just an analyzer."** Feature parity reached |
