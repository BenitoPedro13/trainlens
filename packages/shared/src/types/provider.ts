import type { Activity } from './activity.js';

export type ProviderType = 'strava' | 'garmin' | 'apple_health' | 'polar';

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface ProviderAthleteProfile {
  externalId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface GetActivitiesOptions {
  after?: Date;
  before?: Date;
  page?: number;
  perPage?: number;
}

/**
 * Interface that every fitness data source adapter must implement.
 * The core domain never depends on Strava or any other provider directly.
 */
export interface FitnessProvider {
  readonly providerType: ProviderType;

  getAthleteProfile(tokens: ProviderTokens): Promise<ProviderAthleteProfile>;

  getActivities(tokens: ProviderTokens, options?: GetActivitiesOptions): Promise<Activity[]>;

  getActivityDetail(tokens: ProviderTokens, externalId: string): Promise<Activity>;

  refreshTokens(tokens: ProviderTokens): Promise<ProviderTokens>;

  revokeAccess(tokens: ProviderTokens): Promise<void>;
}
