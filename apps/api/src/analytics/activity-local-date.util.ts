import { toLocalDateKey, parseStravaTimezone } from '@trainlens/shared';

/** Resolve calendar day from DB fields and optional Strava raw payload. */
export function resolveActivityLocalDateKey(
  startedAt: Date,
  timezone: string | null | undefined,
  rawPayload?: unknown,
): string {
  if (timezone) return toLocalDateKey(startedAt, timezone);

  if (rawPayload && typeof rawPayload === 'object') {
    const root = rawPayload as Record<string, unknown>;
    const detail = root['detail'] as Record<string, unknown> | undefined;
    const summary = root['summary'] as Record<string, unknown> | undefined;
    const source = detail ?? summary;

    const local = source?.['start_date_local'];
    if (typeof local === 'string' && local.length >= 10) {
      return local.slice(0, 10);
    }

    const tzRaw = source?.['timezone'];
    if (typeof tzRaw === 'string') {
      const iana = parseStravaTimezone(tzRaw) ?? tzRaw;
      return toLocalDateKey(startedAt, iana);
    }
  }

  return toLocalDateKey(startedAt);
}
