import type { BestEffortCandidate } from './best-efforts.js';
import {
  STANDARD_BEST_EFFORT_DISTANCES,
  candidateLocalDateKey,
  estimateBestEffortSeconds,
} from './best-efforts.js';

export interface BestEffortProgressionPoint {
  label: string;
  distanceMeters: number;
  achievedAt: Date;
  achievedOnLocal: string;
  durationSeconds: number;
  activityId: string;
  isEstimated: boolean;
}

export interface BestEffortProgressionSeries {
  label: string;
  distanceMeters: number;
  points: BestEffortProgressionPoint[];
}

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

/**
 * PR progression: one point each time the athlete sets a new best at a standard distance.
 */
export function extractBestEffortProgression(
  activities: BestEffortCandidate[],
  options?: { activityTypes?: Set<string> },
): BestEffortProgressionSeries[] {
  const allowed = options?.activityTypes ?? RUN_TYPES;
  const eligible = activities.filter(
    (a) =>
      allowed.has(a.activityType) &&
      a.distanceMeters != null &&
      a.distanceMeters > 0 &&
      a.durationSeconds > 0,
  );
  const sorted = [...eligible].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  return STANDARD_BEST_EFFORT_DISTANCES.map(({ meters, label }) => {
    const points: BestEffortProgressionPoint[] = [];
    let bestSeconds: number | null = null;

    for (const a of sorted) {
      const dist = a.distanceMeters!;
      const estimate = estimateBestEffortSeconds(dist, a.durationSeconds, meters);
      if (!estimate) continue;

      if (bestSeconds == null || estimate.seconds < bestSeconds) {
        bestSeconds = estimate.seconds;
        points.push({
          label,
          distanceMeters: meters,
          achievedAt: a.startedAt,
          achievedOnLocal: candidateLocalDateKey(a),
          durationSeconds: estimate.seconds,
          activityId: a.id,
          isEstimated: estimate.isEstimated,
        });
      }
    }

    return { label, distanceMeters: meters, points };
  }).filter((s) => s.points.length > 0);
}
