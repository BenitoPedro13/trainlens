/**
 * Calendar date (YYYY-MM-DD) for an instant in a given IANA timezone.
 * Used for heatmaps, daily metrics, and streaks so they match what the athlete sees.
 */
export function toLocalDateKey(startedAt: Date, timezone?: string | null): string {
  const tz = timezone?.trim();
  if (tz) {
    try {
      return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(startedAt);
    } catch {
      /* invalid IANA name — fall through */
    }
  }
  return startedAt.toISOString().slice(0, 10);
}

/** Strava: "(GMT-03:00) America/Sao_Paulo" → "America/Sao_Paulo" */
export function parseStravaTimezone(raw: string): string | undefined {
  const match = raw.match(/\)\s*(.+)$/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : undefined;
}
