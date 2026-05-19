export interface TrainingLoad {
  date: Date;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

export interface BestEffort {
  distanceMeters: number;
  label: string;
  durationSeconds: number;
  achievedAt: Date;
  activityId: string;
}

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  minBpm: number;
  maxBpm: number;
  durationSeconds: number;
  percentOfTotal: number;
}

export interface ActivitySummary {
  totalActivities: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalElevationGainMeters: number;
  currentStreakDays: number;
  longestStreakDays: number;
  weeklyDistanceMeters: number;
  weeklyActivities: number;
}
