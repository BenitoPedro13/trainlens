import { toLocalDateKey } from '../datetime/local-date.js';

export interface BestEffortCandidate {
  id: string;
  activityType: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  /** Calendar day (YYYY-MM-DD) in the athlete's timezone — set by the API when available */
  localDateKey?: string;
  name?: string;
  timezone?: string | null;
}

export interface BestEffortResult {
  distanceMeters: number;
  label: string;
  durationSeconds: number;
  achievedAt: Date;
  /** Calendar date (YYYY-MM-DD) when the effort happened, athlete-local */
  achievedOnLocal: string;
  activityId: string;
  activityName?: string;
  /** True when time was scaled from a longer activity (not a near-exact distance match) */
  isEstimated: boolean;
}

export const STANDARD_BEST_EFFORT_DISTANCES: Array<{ meters: number; label: string }> = [
  { meters: 1000, label: '1K' },
  { meters: 5000, label: '5K' },
  { meters: 10000, label: '10K' },
  { meters: 21097.5, label: 'Half Marathon' },
  { meters: 42195, label: 'Marathon' },
];

/** Activity distance must reach at least this fraction of the target. */
const MIN_DISTANCE_RATIO = 0.98;
/** Use actual moving time (not scaled) when distance is within this upper bound of target. */
const NEAR_EXACT_UPPER_RATIO = 1.05;

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

export function candidateLocalDateKey(a: BestEffortCandidate): string {
  return a.localDateKey ?? toLocalDateKey(a.startedAt, a.timezone ?? undefined);
}

/**
 * Best time at `targetMeters` for one activity.
 * - Near-exact distance (98–105% of target): actual duration.
 * - Longer activity: proportional estimate.
 * - Too short: not eligible.
 */
export function estimateBestEffortSeconds(
  distanceMeters: number,
  durationSeconds: number,
  targetMeters: number,
): { seconds: number; isEstimated: boolean } | null {
  if (distanceMeters < targetMeters * MIN_DISTANCE_RATIO) return null;

  if (distanceMeters <= targetMeters * NEAR_EXACT_UPPER_RATIO) {
    return { seconds: durationSeconds, isEstimated: false };
  }

  return {
    seconds: Math.round(durationSeconds * (targetMeters / distanceMeters)),
    isEstimated: true,
  };
}

/**
 * Best times at standard distances. Prefers real efforts at that distance over
 * scaled estimates from longer runs on other days.
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
      const estimate = estimateBestEffortSeconds(dist, a.durationSeconds, meters);
      if (!estimate) continue;

      const candidate: BestEffortResult = {
        distanceMeters: meters,
        label,
        durationSeconds: estimate.seconds,
        achievedAt: a.startedAt,
        achievedOnLocal: candidateLocalDateKey(a),
        activityId: a.id,
        isEstimated: estimate.isEstimated,
        ...(a.name ? { activityName: a.name } : {}),
      };

      if (best == null || isBetterEffort(candidate, best)) {
        best = candidate;
      }
    }

    if (best) results.push(best);
  }

  return results;
}

/** Prefer faster time; tie-break toward non-estimated and earlier local date. */
function isBetterEffort(next: BestEffortResult, current: BestEffortResult): boolean {
  if (next.durationSeconds < current.durationSeconds) return true;
  if (next.durationSeconds > current.durationSeconds) return false;
  if (!next.isEstimated && current.isEstimated) return true;
  if (next.isEstimated && !current.isEstimated) return false;
  return next.achievedOnLocal < current.achievedOnLocal;
}
