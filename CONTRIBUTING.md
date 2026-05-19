# Contributing to TrainLens

Thank you for your interest in contributing. This project is in early architecture phase; these guidelines apply as the codebase grows.

## Before You Start

1. Read [`adrs/ARCHITECTURE_DESIGN_BASE.md`](adrs/ARCHITECTURE_DESIGN_BASE.md) for system context.
2. Check existing [ADRs](adrs/) for decisions already made — avoid re-litigating accepted choices without strong reason.
3. For new architectural decisions, copy [`adrs/ADR-TEMPLATE.md`](adrs/ADR-TEMPLATE.md) and open a PR with the ADR before large implementation work.

## Development Setup

See the [README](README.md#getting-started) for prerequisites, environment variables, and local Docker services.

## Pull Request Process

1. Create a focused branch from `main`.
2. Keep changes scoped to one concern per PR when possible.
3. Ensure CI passes:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test` (and `pnpm test:e2e` when touching user flows)
4. Update ADRs or README if behavior, APIs, or env vars change.
5. Write clear commit messages and PR descriptions explaining **why**, not only **what**.

## Code Conventions

- **TypeScript:** `strict: true` in all packages.
- **Monorepo:** Shared types live in `packages/shared`; database access via `packages/database`.
- **Providers:** Never import Strava (or other provider) code from analytics or domain modules — use `FitnessProvider` ([ADR-006](adrs/ADR-006.md)).
- **API:** All routes under `/api/v1/` ([ADR-012](adrs/ADR-012.md)).
- **Queries:** Scope every data access by authenticated `userId`.

## Testing

Follow [ADR-015](adrs/ADR-015.md):

- Unit tests for analytics formulas and pure domain logic.
- Integration tests with Testcontainers for DB and queue behavior.
- Adapter tests use HTTP fixtures — do not call live Strava APIs in CI.
- E2E tests only for critical user paths (keep the suite small).

## Security

- Do not commit secrets, tokens, or real API fixtures with PII.
- Report security issues privately to the maintainers (do not open public issues for vulnerabilities).

## Questions

Open a discussion or issue for design questions. Link relevant ADRs in the conversation.
