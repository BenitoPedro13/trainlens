export type {
  Activity,
  ActivityType,
  ActivityLap,
  ActivityLocation,
  ActivityStream,
  SportCategory,
} from './types/activity.js';

export type {
  FitnessProvider,
  GetActivitiesOptions,
  ProviderAthleteProfile,
  ProviderTokens,
  ProviderType,
} from './types/provider.js';

export type { Connection, ConnectionStatus } from './types/connection.js';

export type {
  ActivitySummary,
  AnalyticsSummaryResponse,
  ActivityListItem,
  ActivityDetailResponse,
  PaginatedActivitiesResponse,
  BestEffort,
  BestEffortsResponse,
  BestEffortProgressionResponse,
  BestEffortProgressionSeries,
  BestEffortProgressionPoint,
  TrainingSettings,
  HeartRateZone,
  PaceZone,
  SportDistributionItem,
  TrainingLoad,
  TrainingLoadResponse,
  WeeklyVolumePoint,
  YearOverYearPoint,
  YearOverYearResponse,
  ZonesResponse,
} from './types/analytics.js';

export {
  calculateActivityTss,
  DEFAULT_FTP_WATTS,
  DEFAULT_THRESHOLD_HR,
  DEFAULT_THRESHOLD_PACE_SEC_PER_KM,
} from './analytics/tss.js';
export type { TssActivityInput } from './analytics/tss.js';

export { resolveAthleteThresholds } from './analytics/athlete-thresholds.js';
export type { AthleteThresholds, AthleteThresholdsInput } from './analytics/athlete-thresholds.js';

export { estimateActivityPower } from './analytics/estimated-power.js';
export type { EstimatedPowerInput } from './analytics/estimated-power.js';

export { extractBestEffortProgression } from './analytics/best-effort-progression.js';
export type {
  BestEffortProgressionPoint as BestEffortProgressionPointCalc,
  BestEffortProgressionSeries as BestEffortProgressionSeriesCalc,
} from './analytics/best-effort-progression.js';

export { computeHeartRateZonesFromStream } from './analytics/zones-streams.js';

export {
  computeTrainingLoadSeries,
  fillDailyTssTimeline,
  CTL_TIME_CONSTANT,
  ATL_TIME_CONSTANT,
} from './analytics/training-load.js';
export type { DailyTssPoint, TrainingLoadPoint } from './analytics/training-load.js';

export {
  extractBestEfforts,
  estimateBestEffortSeconds,
  STANDARD_BEST_EFFORT_DISTANCES,
} from './analytics/best-efforts.js';
export type { BestEffortCandidate, BestEffortResult } from './analytics/best-efforts.js';

export { computeHeartRateZones, computePaceZones } from './analytics/zones.js';
export type { ZoneActivityInput, HeartRateZoneResult, PaceZoneResult } from './analytics/zones.js';

export { computeYearOverYear } from './analytics/year-over-year.js';
export type { YearOverYearInputRow, YearOverYearBucket } from './analytics/year-over-year.js';

export { computeMonotony, computeAcuteChronicRatio } from './analytics/monotony.js';

export { toLocalDateKey, parseStravaTimezone } from './datetime/local-date.js';

export {
  encrypt,
  decrypt,
  serialize,
  deserialize,
  encryptToken,
  decryptToken,
} from './crypto/encryption.js';
export type { TokenEncryptedPayload } from './crypto/encryption.js';
