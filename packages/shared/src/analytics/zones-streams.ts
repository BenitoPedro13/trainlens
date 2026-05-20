import type { HeartRateZoneResult } from './zones.js';

const HR_ZONE_DEFS: Array<{ zone: 1 | 2 | 3 | 4 | 5; label: string; minPct: number; maxPct: number }> =
  [
    { zone: 1, label: 'Z1 Recovery', minPct: 0.5, maxPct: 0.6 },
    { zone: 2, label: 'Z2 Endurance', minPct: 0.6, maxPct: 0.7 },
    { zone: 3, label: 'Z3 Tempo', minPct: 0.7, maxPct: 0.8 },
    { zone: 4, label: 'Z4 Threshold', minPct: 0.8, maxPct: 0.9 },
    { zone: 5, label: 'Z5 VO2max', minPct: 0.9, maxPct: 1.0 },
  ];

function zoneForHrPct(pct: number): (typeof HR_ZONE_DEFS)[number] {
  return (
    HR_ZONE_DEFS.find((z) => pct >= z.minPct && pct < z.maxPct) ??
    (pct >= 0.9 ? HR_ZONE_DEFS[4]! : HR_ZONE_DEFS[0]!)
  );
}

/**
 * Time-in-zone from heartrate stream (Strava: one sample per second when `time` omitted).
 */
export function computeHeartRateZonesFromStream(
  heartrate: number[],
  timeSeconds?: number[],
  maxHeartRate = 190,
): HeartRateZoneResult[] {
  if (!heartrate.length) return [];

  const maxHr = Math.max(
    maxHeartRate,
    ...heartrate.filter((h) => h > 0),
  );
  const durations = new Map<1 | 2 | 3 | 4 | 5, number>();
  for (const z of HR_ZONE_DEFS) durations.set(z.zone, 0);

  let total = 0;
  for (let i = 0; i < heartrate.length; i++) {
    const hr = heartrate[i];
    if (hr == null || hr <= 0) continue;

    let dt = 1;
    if (timeSeconds && i > 0) {
      const prev = timeSeconds[i - 1] ?? 0;
      const curr = timeSeconds[i] ?? prev + 1;
      dt = Math.max(1, curr - prev);
    }

    const zone = zoneForHrPct(hr / maxHr);
    durations.set(zone.zone, (durations.get(zone.zone) ?? 0) + dt);
    total += dt;
  }

  return HR_ZONE_DEFS.map((z) => {
    const durationSeconds = durations.get(z.zone) ?? 0;
    return {
      zone: z.zone,
      label: z.label,
      minBpm: Math.round(maxHr * z.minPct),
      maxBpm: Math.round(maxHr * z.maxPct),
      durationSeconds,
      percentOfTotal: total > 0 ? round1((durationSeconds / total) * 100) : 0,
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
