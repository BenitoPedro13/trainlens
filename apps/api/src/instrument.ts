/**
 * Sentry must be initialised before any other application modules load.
 * Imported first from main.ts (ADR-009).
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['SENTRY_ENVIRONMENT'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0,
  });
}
