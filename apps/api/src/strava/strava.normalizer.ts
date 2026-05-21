/**
 * Pure normalization functions: Strava API shapes → canonical Activity model.
 * No side effects, no DI — easy to unit test with fixture data.
 */

import type { Activity, ActivityType, ActivityLap, ActivityStream, SportCategory } from '@trainlens/shared';
import { parseStravaTimezone } from '@trainlens/shared';
import type {
  StravaSummaryActivity,
  StravaDetailActivity,
  StravaStreamSet,
  StravaLap,
  StravaSegmentEffort,
} from './strava.types';

// ── Activity type mapping ─────────────────────────────────────────────────────

const STRAVA_TYPE_MAP: Record<string, ActivityType> = {
  Run: 'Run',
  TrailRun: 'Run',
  Ride: 'Ride',
  MountainBikeRide: 'Ride',
  GravelRide: 'Ride',
  EBikeRide: 'Ride',
  EMountainBikeRide: 'Ride',
  Swim: 'Swim',
  Walk: 'Walk',
  Hike: 'Hike',
  VirtualRide: 'VirtualRide',
  VirtualRun: 'VirtualRun',
  WeightTraining: 'WeightTraining',
  Yoga: 'Yoga',
  Workout: 'Workout',
  CrossFit: 'CrossFit',
  Rowing: 'Rowing',
  StandUpPaddling: 'StandUpPaddling',
  Kayaking: 'Kayaking',
  Canoeing: 'Kayaking',
  AlpineSki: 'Skiing',
  NordicSki: 'Skiing',
  BackcountrySki: 'Skiing',
  Snowboard: 'Snowboard',
  Golf: 'Golf',
  Soccer: 'Soccer',
  Tennis: 'Tennis',
  Pickleball: 'Tennis',
  Squash: 'Tennis',
  Badminton: 'Tennis',
};

function toActivityType(stravaType: string): ActivityType {
  return STRAVA_TYPE_MAP[stravaType] ?? 'Other';
}

// ── Sport category mapping ────────────────────────────────────────────────────

const SPORT_CATEGORY_MAP: Record<ActivityType, SportCategory> = {
  Run: 'endurance',
  Ride: 'endurance',
  Swim: 'endurance',
  Walk: 'endurance',
  Hike: 'endurance',
  VirtualRide: 'endurance',
  VirtualRun: 'endurance',
  Rowing: 'endurance',
  Kayaking: 'endurance',
  StandUpPaddling: 'endurance',
  WeightTraining: 'strength',
  CrossFit: 'strength',
  Workout: 'strength',
  Yoga: 'flexibility',
  Golf: 'sport',
  Soccer: 'sport',
  Tennis: 'sport',
  Skiing: 'sport',
  Snowboard: 'sport',
  Other: 'other',
};

// ── Conversion helpers ────────────────────────────────────────────────────────

/** Strava speed is m/s. Convert to pace in seconds per km. */
function speedToPaceSecondsPerKm(speedMs: number): number | undefined {
  if (!speedMs || speedMs <= 0) return undefined;
  return Math.round(1000 / speedMs);
}

function normalizeCalories(raw: StravaSummaryActivity): number | undefined {
  if (raw.calories != null && raw.calories > 0) return Math.round(raw.calories);
  // Strava cycling: kilojoules ≈ calories (1 kJ ≈ 0.239 kcal, but convention uses 1:1 in sports)
  if (raw.kilojoules != null && raw.kilojoules > 0) return Math.round(raw.kilojoules);
  return undefined;
}

export function normalizeLap(lap: StravaLap): ActivityLap {
  const pace = speedToPaceSecondsPerKm(lap.average_speed);
  return {
    index: lap.lap_index,
    distanceMeters: lap.distance,
    durationSeconds: lap.moving_time,
    ...(lap.average_heartrate != null && { averageHeartRate: lap.average_heartrate }),
    ...(pace != null && { averagePaceSecondsPerKm: pace }),
    ...(lap.average_watts != null && { averagePowerWatts: lap.average_watts }),
  };
}

function normalizeStreams(raw: StravaStreamSet): ActivityStream {
  return {
    ...(raw.time?.data && { time: raw.time.data }),
    ...(raw.distance?.data && { distance: raw.distance.data }),
    ...(raw.heartrate?.data && { heartrate: raw.heartrate.data }),
    ...(raw.altitude?.data && { altitude: raw.altitude.data }),
    ...(raw.cadence?.data && { cadence: raw.cadence.data }),
    ...(raw.watts?.data && { watts: raw.watts.data }),
    ...(raw.velocity_smooth?.data && { velocity_smooth: raw.velocity_smooth.data }),
    ...(raw.latlng?.data && { latlng: raw.latlng.data }),
  };
}

// ── Segment effort normalizer ─────────────────────────────────────────────────

export interface NormalizedSegmentEffort {
  externalEffortId: string;
  activityExternalId: string;
  segment: {
    externalId: string;
    name: string;
    activityType: ActivityType;
    distanceMeters: number;
    averageGrade?: number;
    maximumGrade?: number;
    elevationHigh?: number;
    elevationLow?: number;
    startLatitude?: number;
    startLongitude?: number;
    endLatitude?: number;
    endLongitude?: number;
    climbCategory?: number;
    city?: string;
    country?: string;
    polyline?: string;
  };
  elapsedSeconds: number;
  movingSeconds?: number;
  startDate: Date;
  averageWatts?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  prRank?: number;
}

export function normalizeSegmentEffort(
  raw: StravaSegmentEffort,
  activityExternalId: string,
): NormalizedSegmentEffort {
  const seg = raw.segment;
  return {
    externalEffortId: String(raw.id),
    activityExternalId,
    segment: {
      externalId: String(seg.id),
      name: seg.name,
      activityType: toActivityType(seg.activity_type),
      distanceMeters: seg.distance,
      ...(seg.average_grade != null && { averageGrade: seg.average_grade }),
      ...(seg.maximum_grade != null && { maximumGrade: seg.maximum_grade }),
      ...(seg.elevation_high != null && { elevationHigh: seg.elevation_high }),
      ...(seg.elevation_low != null && { elevationLow: seg.elevation_low }),
      ...(seg.start_latlng?.length === 2 && { startLatitude: seg.start_latlng[0], startLongitude: seg.start_latlng[1] }),
      ...(seg.end_latlng?.length === 2 && { endLatitude: seg.end_latlng[0], endLongitude: seg.end_latlng[1] }),
      ...(seg.climb_category != null && { climbCategory: seg.climb_category }),
      ...(seg.city && { city: seg.city }),
      ...(seg.country && { country: seg.country }),
      ...(seg.map?.polyline && { polyline: seg.map.polyline }),
    },
    elapsedSeconds: raw.elapsed_time,
    movingSeconds: raw.moving_time,
    startDate: new Date(raw.start_date),
    ...(raw.average_watts != null && { averageWatts: raw.average_watts }),
    ...(raw.average_heartrate != null && { averageHeartRate: raw.average_heartrate }),
    ...(raw.max_heartrate != null && { maxHeartRate: raw.max_heartrate }),
    ...(raw.pr_rank != null && { prRank: raw.pr_rank }),
  };
}

// ── Main normalizers ──────────────────────────────────────────────────────────

export function normalizeSummaryActivity(
  raw: StravaSummaryActivity,
  userId: string,
): Activity {
  const activityType = toActivityType(raw.sport_type || raw.type);

  const calories = normalizeCalories(raw);
  const pace = speedToPaceSecondsPerKm(raw.average_speed);

  return {
    externalId: String(raw.id),
    provider: 'strava',
    userId,

    name: raw.name,
    ...(raw.description && { description: raw.description }),
    activityType,
    sportCategory: SPORT_CATEGORY_MAP[activityType] ?? 'other',

    startedAt: new Date(raw.start_date),
    ...(raw.timezone && {
      timezone: parseStravaTimezone(raw.timezone) ?? raw.timezone,
    }),
    durationSeconds: raw.elapsed_time,

    ...(raw.distance > 0 && { distanceMeters: raw.distance }),
    ...(raw.total_elevation_gain > 0 && { elevationGainMeters: raw.total_elevation_gain }),

    ...(raw.average_heartrate != null && { averageHeartRate: raw.average_heartrate }),
    ...(raw.max_heartrate != null && { maxHeartRate: raw.max_heartrate }),
    ...(pace != null && { averagePaceSecondsPerKm: pace }),
    ...(raw.average_watts != null && { averagePowerWatts: raw.average_watts }),
    ...(raw.weighted_average_watts != null && { normalizedPowerWatts: raw.weighted_average_watts }),
    ...(raw.max_watts != null && { maxPowerWatts: raw.max_watts }),
    ...(raw.average_cadence != null && { averageCadence: raw.average_cadence }),
    ...(calories != null && { calories }),

    ...(raw.start_latlng?.length === 2 && {
      startLocation: { latitude: raw.start_latlng[0], longitude: raw.start_latlng[1] },
    }),
    ...(raw.end_latlng?.length === 2 && {
      endLocation: { latitude: raw.end_latlng[0], longitude: raw.end_latlng[1] },
    }),
    ...(raw.map.summary_polyline && { summaryPolyline: raw.map.summary_polyline }),

    ...(raw.device_name && { deviceName: raw.device_name }),
    manual: raw.manual,
  };
}

export function normalizeDetailActivity(
  raw: StravaDetailActivity,
  userId: string,
  streams?: StravaStreamSet,
): Activity {
  const base = normalizeSummaryActivity(raw, userId);

  return {
    ...base,
    ...(raw.laps?.length && { laps: raw.laps.map(normalizeLap) }),
    ...(streams && { streams: normalizeStreams(streams) }),
  };
}
