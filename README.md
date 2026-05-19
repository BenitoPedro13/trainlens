# TrainLens

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange)](https://pnpm.io/)

**TrainLens** is a free, multi-source fitness analytics platform that ingests exercise data from providers like Strava, Garmin, Apple Health, and Polar, and turns raw activity data into meaningful, actionable insights for athletes of all levels.

> **Status:** Pre-implementation — architecture and ADRs are defined; application code is not yet scaffolded.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [API](#api)
- [Security & Privacy](#security--privacy)
- [Roadmap](#roadmap)
- [Architecture Decision Records](#architecture-decision-records)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### MVP (Phase 1 — Strava)

- OAuth connection to Strava with encrypted token storage
- Bulk historical import and real-time sync via webhooks
- Dashboard: weekly volume, activity calendar, sport distribution
- Activity log with key metrics
- Account settings: disconnect provider, data export, account deletion

### Planned Analytics

| Category                 | Examples                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Training load**        | CTL / ATL / TSB (Performance Management Chart), weekly TSS, monotony, acute:chronic ratio |
| **Volume & consistency** | Activity heatmap, streaks, sport distribution, year-over-year                             |
| **Performance**          | Best efforts, pace/power histograms, HR zones, VO₂max trend, critical power               |
| **Recovery & patterns**  | Rest-day distribution, time-of-day heatmap, post-race recovery                            |
| **Geo & routes**         | GPS heatmap, route clustering, elevation archives                                         |
| **Advanced**             | Fitness age, race time predictor, training plan adherence, milestones                     |

---

## Architecture

TrainLens follows an **adapter-first** design: every data source is a pluggable provider; the core domain never depends on Strava or any single vendor.

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT          Next.js (App Router) · TanStack Query · Recharts│
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST (v1) + SSE
┌──────────────────────────────▼──────────────────────────────────┐
│  API             NestJS · JWT · Rate limiting · Pino             │
└────────┬─────────────────────┬──────────────────────────────────┘
         │                     │
┌────────▼────────┐   ┌────────▼────────┐
│  Core Domain    │   │  Sync Engine    │
│  Analytics      │   │  BullMQ Workers │
└────────┬────────┘   └────────┬────────┘
         │                     │
┌────────▼─────────────────────▼────────┐
│  DATA            PostgreSQL + TimescaleDB · Redis │
└────────┬──────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────────────────────┐
│  ADAPTERS        Strava · Garmin* · Apple Health* · Polar*        │
└──────────────────────────────────────────────────────────────────┘
```

**Core principles**

- **Adapter-first** — pluggable providers; business logic stays provider-agnostic
- **Insight-driven** — raw data is cheap; interpretation is the value
- **Privacy-respecting** — users own their data; no selling, no ads
- **Observable** — structured logging, error tracking, and job monitoring from day one
- **Monorepo** — shared types and contracts prevent drift as the team grows

For the full design document, see [`adrs/ARCHITECTURE_DESIGN_BASE.md`](adrs/ARCHITECTURE_DESIGN_BASE.md).

---

## Tech Stack

| Layer             | Technology                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**      | [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces                                                      |
| **Web**           | [Next.js 14](https://nextjs.org/) (App Router), [TanStack Query](https://tanstack.com/query), [Auth.js](https://authjs.dev/) |
| **API**           | [NestJS](https://nestjs.com/), REST `/api/v1/`, JWT guards                                                                   |
| **Database**      | [PostgreSQL](https://www.postgresql.org/) + [TimescaleDB](https://www.timescale.com/)                                        |
| **ORM**           | [Prisma](https://www.prisma.io/) (`packages/database`)                                                                       |
| **Jobs & cache**  | [BullMQ](https://docs.bullmq.io/) + [Redis](https://redis.io/)                                                               |
| **Charts**        | [Recharts](https://recharts.org/) + [D3.js](https://d3js.org/) (selective)                                                   |
| **Observability** | [Pino](https://getpino.io/), [Sentry](https://sentry.io/), [Bull Board](https://github.com/felixmosh/bull-board)             |
| **Infra (local)** | Docker Compose                                                                                                               |
| **Testing**       | Jest, Testcontainers, Playwright, nock/msw                                                                                   |

---

## Repository Structure

Planned monorepo layout (see [ADR-001](adrs/ADR-001.md)):

```
trainlens/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/
│   ├── database/            # Prisma schema + client
│   ├── shared/              # Domain types, FitnessProvider interface, analytics formulas
│   └── ui/                  # Shared React components
├── infra/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── adrs/                    # Architectural Decision Records
├── docs/                    # Detailed sub-documents (planned)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Prerequisites

| Tool                                                     | Version                                         |
| -------------------------------------------------------- | ----------------------------------------------- |
| [Node.js](https://nodejs.org/)                           | ≥ 20 LTS                                        |
| [pnpm](https://pnpm.io/installation)                     | ≥ 9                                             |
| [Docker](https://www.docker.com/) & Docker Compose       | Latest (for PostgreSQL, Redis, local stack)     |
| [Strava API](https://developers.strava.com/) credentials | For OAuth and webhooks (when implementing sync) |

---

## Getting Started

> The monorepo scaffold is not yet in place. The steps below describe the intended workflow once `apps/` and `packages/` exist.

### 1. Clone and install

```bash
git clone https://github.com/<your-org>/trainlens.git
cd trainlens
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your local values (Strava, encryption key, etc.)
```

### 3. Start infrastructure + database

```bash
pnpm db:setup
```

This starts Docker (PostgreSQL/TimescaleDB + Redis), applies migrations, and configures
the TimescaleDB hypertable — all in one command.

### 4. Run development servers

```bash
pnpm dev
```

| Service       | URL                          |
| ------------- | ---------------------------- |
| Web (Next.js) | http://localhost:3000        |
| API (NestJS)  | http://localhost:3001        |
| Bull Board    | http://localhost:3002        |
| Health check  | http://localhost:3001/health |

---

## Environment Variables

Copy [`.env.example`](.env.example) to `.env` at the repository root. Key groups:

| Group             | Variables                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| **Database**      | `DATABASE_URL`                                                            |
| **Redis**         | `REDIS_URL`                                                               |
| **Strava**        | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN` |
| **Auth**          | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`                           |
| **Encryption**    | `TOKEN_ENCRYPTION_KEY` (master KEK for OAuth tokens)                      |
| **Observability** | `SENTRY_DSN`                                                              |
| **App**           | `NEXT_PUBLIC_API_URL`                                                     |

Never commit `.env` or secrets. See [ADR-011](adrs/ADR-011.md) for token encryption details.

---

## Development

### Common commands (planned)

```bash
pnpm dev              # Start all apps in development mode
pnpm build            # Production build (Turborepo pipeline)
pnpm lint             # ESLint across the monorepo
pnpm typecheck        # tsc --noEmit in all packages
pnpm test             # Unit + integration tests
pnpm test:e2e         # Playwright E2E (requires Docker stack)
```

### Strava OAuth flow (summary)

1. User clicks **Connect Strava** in the web app.
2. Auth.js redirects to Strava OAuth (`activity:read_all`).
3. Callback exchanges the code for tokens via the NestJS API.
4. Tokens are stored encrypted ([envelope encryption](adrs/ADR-011.md)).
5. A BullMQ job runs bulk import of historical activities.
6. Strava webhooks push incremental updates ([idempotent handler](adrs/ADR-013.md)).

### Adding a new data provider

Implement the `FitnessProvider` interface in `packages/shared` and register a NestJS module under `apps/api/src/providers/`. See [ADR-006](adrs/ADR-006.md) and the planned `docs/ADAPTER_DEVELOPMENT_GUIDE.md`.

---

## Testing

Strategy defined in [ADR-015](adrs/ADR-015.md):

| Layer       | Tool                  | Scope                                               |
| ----------- | --------------------- | --------------------------------------------------- |
| Unit        | Jest                  | Analytics formulas, normalization, domain utilities |
| Integration | Jest + Testcontainers | API, DB, BullMQ, webhook idempotency                |
| Adapter     | Jest + nock/msw       | Strava HTTP fixtures (no live API in CI)            |
| E2E         | Playwright            | Login, connect, dashboard, settings                 |
| Contract    | TypeScript `strict`   | Shared types across packages                        |

Target CI pipeline: **under 5 minutes** for lint, typecheck, unit, adapter, integration, and E2E.

---

## API

- **Base URL:** `/api/v1/` ([ADR-012](adrs/ADR-012.md))
- **Auth:** Bearer JWT from Auth.js session
- **Versioning:** URL prefix; v1 deprecated with `Deprecation` header before removal

Example endpoints (planned):

| Method | Path                              | Description                |
| ------ | --------------------------------- | -------------------------- |
| `GET`  | `/api/v1/activities`              | List user activities       |
| `GET`  | `/api/v1/analytics/daily-metrics` | Pre-aggregated daily stats |
| `POST` | `/api/v1/webhooks/strava`         | Strava webhook receiver    |
| `GET`  | `/health`                         | DB, Redis, queue health    |

---

## Security & Privacy

| Concern       | Mitigation                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| OAuth tokens  | AES-256-GCM envelope encryption ([ADR-011](adrs/ADR-011.md))                                |
| API access    | Short-lived JWTs; all queries scoped by `userId`                                            |
| Webhooks      | Verify token + idempotency log ([ADR-013](adrs/ADR-013.md))                                 |
| Rate limiting | `@nestjs/throttler` on API; BullMQ limiter for Strava                                       |
| GDPR          | Soft delete (30-day grace), data export, cascading hard delete ([ADR-014](adrs/ADR-014.md)) |

---

## Roadmap

| Phase                | Focus                                                           |
| -------------------- | --------------------------------------------------------------- |
| **1 — MVP**          | Monorepo, auth, Strava sync, basic dashboard, account settings  |
| **2 — Analytics**    | CTL/ATL/TSB, best efforts, HR zones, YoY comparison             |
| **3 — Geo**          | Activity heatmap, route clustering, elevation                   |
| **4 — Multi-source** | Garmin, Apple Health, Polar, deduplication                      |
| **5 — Intelligence** | Race predictor, training plans, anomaly detection, digest email |

Detailed checklist: [`adrs/ARCHITECTURE_DESIGN_BASE.md#15-phased-roadmap`](adrs/ARCHITECTURE_DESIGN_BASE.md#15-phased-roadmap).

---

## Architecture Decision Records

All significant technical decisions are documented as ADRs in [`adrs/`](adrs/):

| ADR                    | Title                              |
| ---------------------- | ---------------------------------- |
| [001](adrs/ADR-001.md) | Monorepo: Turborepo + pnpm         |
| [002](adrs/ADR-002.md) | Database: PostgreSQL + TimescaleDB |
| [003](adrs/ADR-003.md) | ORM: Prisma                        |
| [004](adrs/ADR-004.md) | Background jobs: BullMQ + Redis    |
| [005](adrs/ADR-005.md) | Auth: Auth.js + NestJS JWT         |
| [006](adrs/ADR-006.md) | Adapter architecture               |
| [007](adrs/ADR-007.md) | Frontend data fetching             |
| [008](adrs/ADR-008.md) | Charts: Recharts + D3              |
| [009](adrs/ADR-009.md) | Observability                      |
| [010](adrs/ADR-010.md) | Raw activity storage               |
| [011](adrs/ADR-011.md) | Token & key management             |
| [012](adrs/ADR-012.md) | API versioning                     |
| [013](adrs/ADR-013.md) | Webhook idempotency                |
| [014](adrs/ADR-014.md) | Data lifecycle & GDPR              |
| [015](adrs/ADR-015.md) | Testing strategy                   |

Use [`adrs/ADR-TEMPLATE.md`](adrs/ADR-TEMPLATE.md) for new decisions.

---

## Contributing

1. Read the relevant ADRs before proposing architectural changes.
2. Follow existing conventions in each package once code exists.
3. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR.
4. Add or update ADRs for decisions that affect multiple apps or packages.

See [CONTRIBUTING.md](CONTRIBUTING.md) for more detail.

---

## License

This project is licensed under the [MIT License](LICENSE).
