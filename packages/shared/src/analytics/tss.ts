import type { AthleteThresholds } from './athlete-thresholds.js';
import { resolveAthleteThresholds } from './athlete-thresholds.js';

/** Input fields used to estimate Training Stress Score (TSS). */
export interface TssActivityInput {
  durationSeconds: number;
  activityType: string;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  averagePowerWatts?: number | null;
  normalizedPowerWatts?: number | null;
  averagePaceSecondsPerKm?: number | null;
}

const CYCLING_TYPES = new Set(['Ride', 'VirtualRide']);
const RUNNING_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

/** Default athlete thresholds when not configured per user. */
export const DEFAULT_FTP_WATTS = 200;
export const DEFAULT_THRESHOLD_HR = 170;
export const DEFAULT_THRESHOLD_PACE_SEC_PER_KM = 300; // 5:00 / km

/**
 * Estimate TSS for a single activity.
 * Priority: power → heart rate → pace → duration fallback.
 */
export function calculateActivityTss(
  input: TssActivityInput,
  thresholds?: AthleteThresholds,
): number {
  const t = thresholds ?? resolveAthleteThresholds();
  const hours = input.durationSeconds / 3600;
  if (hours <= 0) return 0;

  const power = input.normalizedPowerWatts ?? input.averagePowerWatts;
  if (power != null && power > 0 && CYCLING_TYPES.has(input.activityType)) {
    const if_ = Math.min(power / t.ftpWatts, 1.5);
    return roundTss(((input.durationSeconds * power * if_) / (t.ftpWatts * 3600)) * 100);
  }

  const avgHr = input.averageHeartRate;
  if (avgHr != null && avgHr > 0) {
    const threshold =
      input.maxHeartRate != null && input.maxHeartRate > 0
        ? Math.round(input.maxHeartRate * 0.9)
        : t.thresholdHeartRate;
    const hrRatio = Math.min(Math.max(avgHr / threshold, 0.5), 1.5);
    return roundTss(hours * hrRatio * hrRatio * 100);
  }

  const pace = input.averagePaceSecondsPerKm;
  if (pace != null && pace > 0 && RUNNING_TYPES.has(input.activityType)) {
    const if_ = Math.min(t.thresholdPaceSecondsPerKm / pace, 1.5);
    return roundTss(hours * if_ * if_ * 100);
  }

  const sportFactor = CYCLING_TYPES.has(input.activityType)
    ? 55
    : RUNNING_TYPES.has(input.activityType)
      ? 50
      : 40;
  return roundTss(hours * sportFactor);
}

function roundTss(value: number): number {
  return Math.round(value * 10) / 10;
}
