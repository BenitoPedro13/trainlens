export interface BestEffortCandidate {
  id: string;
  activityType: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
}

export interface BestEffortResult {
  distanceMeters: number;
  label: string;
  durationSeconds: number;
  achievedAt: Date;
  activityId: string;
}

export const STANDARD_BEST_EFFORT_DISTANCES: Array<{ meters: number; label: string }> = [
  { meters: 1000, label: '1K' },
  { meters: 5000, label: '5K' },
  { meters: 10000, label: '10K' },
  { meters: 21097.5, label: 'Half Marathon' },
  { meters: 42195, label: 'Marathon' },
];

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

/**
 * Estimate best times at standard distances from activity summaries.
 * Uses proportional scaling when distance >= 98% of target.
 */
export function extractBestEfforts(
  activities: BestEffortCandidate[],
  options?: { activityTypes?: Set<string> },
): BestEffortResult[] {
  const allowed = options?.activityTypes ?? RUN_TYPES;
  const eligible = activities.filter(
    (a) =>
      allowed.has(a.activityType) &&
      a.distanceMeters != null &&
      a.distanceMeters > 0 &&
      a.durationSeconds > 0,
  );

  const results: BestEffortResult[] = [];

  for (const { meters, label } of STANDARD_BEST_EFFORT_DISTANCES) {
    let best: BestEffortResult | null = null;

    for (const a of eligible) {
      const dist = a.distanceMeters!;
      if (dist < meters * 0.98) continue;

      const estimatedSeconds = Math.round(a.durationSeconds * (meters / dist));
      if (best == null || estimatedSeconds < best.durationSeconds) {
        best = {
          distanceMeters: meters,
          label,
          durationSeconds: estimatedSeconds,
          achievedAt: a.startedAt,
          activityId: a.id,
        };
      }
    }

    if (best) results.push(best);
  }

  return results;
}
