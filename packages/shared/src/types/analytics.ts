export interface TrainingLoad {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

export interface TrainingLoadResponse {
  points: TrainingLoad[];
}

export interface BestEffortsResponse {
  efforts: BestEffort[];
}

export interface BestEffortProgressionPoint {
  label: string;
  distanceMeters: number;
  achievedAt: string;
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

export interface BestEffortProgressionResponse {
  series: BestEffortProgressionSeries[];
}

export interface TrainingSettings {
  ftpWatts: number | null;
  maxHeartRate: number | null;
  weightKg: number | null;
  thresholdPaceSecondsPerKm: number | null;
}

export interface PaceZone {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  minSecondsPerKm: number;
  maxSecondsPerKm: number;
  durationSeconds: number;
  percentOfTotal: number;
}

export interface ZonesResponse {
  heartRate: HeartRateZone[];
  pace: PaceZone[];
}

export interface YearOverYearPoint {
  period: string;
  year: number;
  weekOrMonth: number;
  distanceMeters: number;
  activityCount: number;
  tss: number;
}

export interface YearOverYearResponse {
  mode: 'week' | 'month';
  points: YearOverYearPoint[];
}

export interface BestEffort {
  distanceMeters: number;
  label: string;
  durationSeconds: number;
  achievedAt: string;
  /** Athlete-local calendar date (YYYY-MM-DD) */
  achievedOnLocal: string;
  activityId: string;
  activityName?: string;
  isEstimated: boolean;
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
  /** Last 7 days with TSS > 0 (Sprint 4.11). */
  monotony: number;
  /** Latest ATL / CTL (Sprint 4.11). */
  acuteChronicRatio: number;
}

export interface PaceHistogramBin {
  label: string;
  minSecondsPerKm: number;
  maxSecondsPerKm: number;
  count: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

export interface PaceHistogramResponse {
  bins: PaceHistogramBin[];
  activityCount: number;
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

import type { ActivityLap } from './activity.js';

export interface ActivityDetailResponse extends ActivityListItem {
  estimatedPowerWatts?: number | null;
  description: string | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averagePaceSecondsPerKm: number | null;
  averagePowerWatts: number | null;
  calories: number | null;
  summaryPolyline: string | null;
  deviceName: string | null;
  manual: boolean;
  laps?: ActivityLap[];
  rawPayload?: unknown;
}
