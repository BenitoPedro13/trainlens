export type ActivityType =
  | 'Run'
  | 'Ride'
  | 'Swim'
  | 'Walk'
  | 'Hike'
  | 'VirtualRide'
  | 'VirtualRun'
  | 'WeightTraining'
  | 'Yoga'
  | 'Workout'
  | 'CrossFit'
  | 'Rowing'
  | 'StandUpPaddling'
  | 'Kayaking'
  | 'Skiing'
  | 'Snowboard'
  | 'Golf'
  | 'Soccer'
  | 'Tennis'
  | 'Other';

export type SportCategory = 'endurance' | 'strength' | 'flexibility' | 'sport' | 'other';

export interface ActivityLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface ActivityLap {
  index: number;
  distanceMeters: number;
  durationSeconds: number;
  averageHeartRate?: number;
  averagePaceSecondsPerKm?: number;
  averagePowerWatts?: number;
}

export interface ActivityStream {
  time?: number[];
  distance?: number[];
  heartrate?: number[];
  altitude?: number[];
  cadence?: number[];
  watts?: number[];
  velocity_smooth?: number[];
  latlng?: [number, number][];
}

/**
 * Canonical activity model used across the platform.
 * All provider adapters must produce this shape.
 */
export interface Activity {
  externalId: string;
  provider: string;
  userId: string;

  name: string;
  description?: string;
  activityType: ActivityType;
  sportCategory: SportCategory;

  startedAt: Date;
  /** IANA timezone from provider (e.g. America/Sao_Paulo) for local-day bucketing */
  timezone?: string;
  durationSeconds: number;

  distanceMeters?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;

  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePaceSecondsPerKm?: number;
  averagePowerWatts?: number;
  normalizedPowerWatts?: number;
  maxPowerWatts?: number;

  averageCadence?: number;
  calories?: number;

  startLocation?: ActivityLocation;
  endLocation?: ActivityLocation;
  summaryPolyline?: string;

  laps?: ActivityLap[];
  streams?: ActivityStream;

  deviceName?: string;
  manual: boolean;

  tss?: number;
}
