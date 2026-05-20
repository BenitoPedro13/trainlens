const CYCLING_TYPES = new Set(['Ride', 'VirtualRide']);
const RUNNING_TYPES = new Set(['Run', 'VirtualRun', 'Walk', 'Hike']);

export interface EstimatedPowerInput {
  activityType: string;
  durationSeconds: number;
  distanceMeters?: number | null;
  elevationGainMeters?: number | null;
  averagePowerWatts?: number | null;
  normalizedPowerWatts?: number | null;
  weightKg?: number;
}

/**
 * Estimated mechanical power (W) when no power meter data exists.
 * Returns null when real power is present or inputs are insufficient.
 */
export function estimateActivityPower(input: EstimatedPowerInput): number | null {
  const real = input.normalizedPowerWatts ?? input.averagePowerWatts;
  if (real != null && real > 0) return null;

  if (input.durationSeconds <= 0) return null;
  const distance = input.distanceMeters ?? 0;
  if (distance <= 0) return null;

  const weight = input.weightKg ?? 75;
  const speed = distance / input.durationSeconds;
  const grade = (input.elevationGainMeters ?? 0) / distance;

  if (CYCLING_TYPES.has(input.activityType)) {
    const crr = 0.004;
    const cda = 0.32;
    const rho = 1.225;
    const rolling = crr * weight * 9.81 * speed;
    const aero = 0.5 * rho * cda * speed ** 3;
    const climbing = weight * 9.81 * speed * Math.max(grade, 0);
    return Math.round(rolling + aero + climbing);
  }

  if (RUNNING_TYPES.has(input.activityType)) {
    const horizontal = 1.04 * weight * speed;
    const vertical = weight * 9.81 * speed * Math.max(grade, 0);
    return Math.round(horizontal + vertical);
  }

  return null;
}
