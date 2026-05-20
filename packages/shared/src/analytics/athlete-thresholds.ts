import {
  DEFAULT_FTP_WATTS,
  DEFAULT_THRESHOLD_HR,
  DEFAULT_THRESHOLD_PACE_SEC_PER_KM,
} from './tss.js';

export interface AthleteThresholds {
  ftpWatts: number;
  thresholdHeartRate: number;
  thresholdPaceSecondsPerKm: number;
  weightKg: number;
}

export interface AthleteThresholdsInput {
  ftpWatts?: number | null;
  maxHeartRate?: number | null;
  weightKg?: number | null;
  thresholdPaceSecondsPerKm?: number | null;
}

export function resolveAthleteThresholds(input?: AthleteThresholdsInput | null): AthleteThresholds {
  const maxHr = input?.maxHeartRate;
  return {
    ftpWatts: input?.ftpWatts ?? DEFAULT_FTP_WATTS,
    thresholdHeartRate:
      maxHr != null && maxHr > 0 ? Math.round(maxHr * 0.9) : DEFAULT_THRESHOLD_HR,
    thresholdPaceSecondsPerKm:
      input?.thresholdPaceSecondsPerKm ?? DEFAULT_THRESHOLD_PACE_SEC_PER_KM,
    weightKg: input?.weightKg ?? 75,
  };
}
