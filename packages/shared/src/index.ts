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
  HeartRateZone,
  SportDistributionItem,
  TrainingLoad,
  WeeklyVolumePoint,
} from './types/analytics.js';

export {
  encrypt,
  decrypt,
  serialize,
  deserialize,
  encryptToken,
  decryptToken,
} from './crypto/encryption.js';
export type { TokenEncryptedPayload } from './crypto/encryption.js';
