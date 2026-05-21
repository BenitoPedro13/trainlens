/**
 * Raw shapes returned by the Strava v3 API.
 * These types are used only inside the adapter/normalizer — the rest of the
 * application never sees Strava-specific types.
 */

export interface StravaMap {
  id: string;
  summary_polyline: string | null;
  resource_state: number;
}

export interface StravaLap {
  id: number;
  lap_index: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_heartrate?: number;
  average_speed: number;
  average_watts?: number;
}

/** Returned by GET /athlete/activities (summary) */
export interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  description?: string | null;
  start_date: string;
  /** Local start time (Strava); date portion is the athlete's calendar day */
  start_date_local?: string;
  timezone?: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  elev_high?: number | null;
  elev_low?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_speed: number;
  max_speed: number;
  average_watts?: number | null;
  weighted_average_watts?: number | null;
  max_watts?: number | null;
  average_cadence?: number | null;
  kilojoules?: number | null;
  calories?: number | null;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  map: StravaMap;
  device_name?: string | null;
  manual: boolean;
  trainer: boolean;
}

export interface StravaSegmentSummary {
  id: number;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  climb_category: number;
  city: string | null;
  country: string | null;
  map?: { polyline?: string };
}

export interface StravaSegmentEffort {
  id: number;
  segment: StravaSegmentSummary;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  average_watts?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  pr_rank?: number | null;
}

/** Returned by GET /activities/:id (detail — adds laps) */
export interface StravaDetailActivity extends StravaSummaryActivity {
  laps: StravaLap[];
  segment_efforts?: StravaSegmentEffort[];
}

/** Returned by GET /activities/:id/streams */
export interface StravaStreamSet {
  time?: { data: number[] };
  distance?: { data: number[] };
  heartrate?: { data: number[] };
  altitude?: { data: number[] };
  cadence?: { data: number[] };
  watts?: { data: number[] };
  velocity_smooth?: { data: number[] };
  latlng?: { data: [number, number][] };
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

export interface StravaAthleteProfile {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  profile_medium: string;
}
