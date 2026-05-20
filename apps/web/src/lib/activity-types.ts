/** Canonical activity types (matches Prisma ActivityType enum). */
export const ACTIVITY_TYPES = [
  'Run',
  'Ride',
  'Swim',
  'Walk',
  'Hike',
  'VirtualRide',
  'VirtualRun',
  'WeightTraining',
  'Yoga',
  'Workout',
  'CrossFit',
  'Rowing',
  'Other',
] as const;

export type ActivityTypeFilter = (typeof ACTIVITY_TYPES)[number];
