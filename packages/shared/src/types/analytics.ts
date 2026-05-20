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

export interface WeeklyVolumePoint {
  weekStart: string;
  distanceMeters: number;
  activityCount: number;
}

export interface SportDistributionItem {
  activityType: string;
  count: number;
  distanceMeters: number;
}

export interface AnalyticsSummaryResponse extends ActivitySummary {
  weeklyVolume: WeeklyVolumePoint[];
  sportDistribution: SportDistributionItem[];
}

export interface ActivityListItem {
  id: string;
  externalId: string;
  name: string;
  activityType: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
}

export interface PaginatedActivitiesResponse {
  items: ActivityListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityDetailResponse extends ActivityListItem {
  description: string | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averagePaceSecondsPerKm: number | null;
  averagePowerWatts: number | null;
  calories: number | null;
  summaryPolyline: string | null;
  deviceName: string | null;
  manual: boolean;
  rawPayload?: unknown;
}
