export interface ZoneActivityInput {
  durationSeconds: number;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  averagePaceSecondsPerKm?: number | null;
  activityType: string;
}

export interface HeartRateZoneResult {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  minBpm: number;
  maxBpm: number;
  durationSeconds: number;
  percentOfTotal: number;
}

export interface PaceZoneResult {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  minSecondsPerKm: number;
  maxSecondsPerKm: number;
  durationSeconds: number;
  percentOfTotal: number;
}

const HR_ZONE_DEFS: Array<{ zone: 1 | 2 | 3 | 4 | 5; label: string; minPct: number; maxPct: number }> =
  [
    { zone: 1, label: 'Z1 Recovery', minPct: 0.5, maxPct: 0.6 },
    { zone: 2, label: 'Z2 Endurance', minPct: 0.6, maxPct: 0.7 },
    { zone: 3, label: 'Z3 Tempo', minPct: 0.7, maxPct: 0.8 },
    { zone: 4, label: 'Z4 Threshold', minPct: 0.8, maxPct: 0.9 },
    { zone: 5, label: 'Z5 VO2max', minPct: 0.9, maxPct: 1.0 },
  ];

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

/**
 * Distribute activity duration into HR zones using average HR per activity.
 * (Stream-level analysis can replace this later.)
 */
export function computeHeartRateZones(
  activities: ZoneActivityInput[],
  maxHrEstimate = 190,
): HeartRateZoneResult[] {
  const withHr = activities.filter((a) => a.averageHeartRate != null && a.averageHeartRate > 0);
  if (!withHr.length) return [];

  const maxHr =
    Math.max(
      maxHrEstimate,
      ...withHr.map((a) => a.maxHeartRate ?? a.averageHeartRate ?? 0),
    ) || maxHrEstimate;

  const durations = new Map<1 | 2 | 3 | 4 | 5, number>();
  for (const z of HR_ZONE_DEFS) durations.set(z.zone, 0);

  let total = 0;
  for (const a of withHr) {
    const hr = a.averageHeartRate!;
    const pct = hr / maxHr;
    const zone =
      HR_ZONE_DEFS.find((z) => pct >= z.minPct && pct < z.maxPct) ??
      (pct >= 0.9 ? HR_ZONE_DEFS[4] : HR_ZONE_DEFS[0]);
    const prev = durations.get(zone!.zone) ?? 0;
    durations.set(zone!.zone, prev + a.durationSeconds);
    total += a.durationSeconds;
  }

  return HR_ZONE_DEFS.map((z) => {
    const minBpm = Math.round(maxHr * z.minPct);
    const maxBpm = Math.round(maxHr * z.maxPct);
    const durationSeconds = durations.get(z.zone) ?? 0;
    return {
      zone: z.zone,
      label: z.label,
      minBpm,
      maxBpm,
      durationSeconds,
      percentOfTotal: total > 0 ? round1((durationSeconds / total) * 100) : 0,
    };
  });
}

/** Pace zones from average pace per run (faster = higher zone). */
export function computePaceZones(activities: ZoneActivityInput[]): PaceZoneResult[] {
  const runs = activities.filter(
    (a) =>
      RUN_TYPES.has(a.activityType) &&
      a.averagePaceSecondsPerKm != null &&
      a.averagePaceSecondsPerKm > 0,
  );
  if (!runs.length) return [];

  const thresholds = [420, 360, 300, 270, 0]; // sec/km boundaries (slower to faster)
  const labels = ['Z1 Easy', 'Z2 Moderate', 'Z3 Tempo', 'Z4 Threshold', 'Z5 Speed'];
  const durations = [0, 0, 0, 0, 0];
  let total = 0;

  for (const a of runs) {
    const pace = a.averagePaceSecondsPerKm!;
    let idx = 0;
    if (pace <= 270) idx = 4;
    else if (pace <= 300) idx = 3;
    else if (pace <= 360) idx = 2;
    else if (pace <= 420) idx = 1;
    durations[idx] = (durations[idx] ?? 0) + a.durationSeconds;
    total += a.durationSeconds;
  }

  return labels.map((label, i) => {
    const minSecondsPerKm = thresholds[i + 1] ?? 0;
    const maxSecondsPerKm = thresholds[i] ?? 9999;
    const durationSeconds = durations[i] ?? 0;
    return {
      zone: (i + 1) as 1 | 2 | 3 | 4 | 5,
      label,
      minSecondsPerKm,
      maxSecondsPerKm,
      durationSeconds,
      percentOfTotal: total > 0 ? round1((durationSeconds / total) * 100) : 0,
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
