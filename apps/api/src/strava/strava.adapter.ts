import { Injectable, Logger } from '@nestjs/common';
import type {
  FitnessProvider,
  ProviderTokens,
  ProviderAthleteProfile,
  GetActivitiesOptions,
  Activity,
} from '@trainlens/shared';
import type {
  StravaSummaryActivity,
  StravaDetailActivity,
  StravaStreamSet,
  StravaTokenResponse,
  StravaAthleteProfile,
} from './strava.types';
import { normalizeSummaryActivity, normalizeDetailActivity } from './strava.normalizer';

const BASE_URL = 'https://www.strava.com/api/v3';
const AUTH_URL = 'https://www.strava.com/oauth/token';

const STREAM_KEYS = 'time,distance,heartrate,altitude,cadence,watts,velocity_smooth,latlng';

/** Max activities per page (Strava cap). */
const PAGE_SIZE = 200;

/** Delay between paginated requests to stay well under Strava rate limits. */
const PAGE_DELAY_MS = 300;

@Injectable()
export class StravaAdapter implements FitnessProvider {
  readonly providerType = 'strava' as const;

  private readonly logger = new Logger(StravaAdapter.name);

  // ── Internal HTTP helper ──────────────────────────────────────────────────

  private async get<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('x-ratelimit-usage') ?? '15 min';
      throw new StravaRateLimitError(`Strava rate limit exceeded — retry after ${retryAfter}`);
    }

    if (res.status === 401) {
      throw new StravaUnauthorizedError('Strava access token expired or revoked');
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Strava API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // ── FitnessProvider implementation ───────────────────────────────────────

  async getAthleteProfile(tokens: ProviderTokens): Promise<ProviderAthleteProfile> {
    const profile = await this.get<StravaAthleteProfile>('/athlete', tokens.accessToken);
    return {
      externalId: String(profile.id),
      ...(profile.username && { username: profile.username }),
      firstName: profile.firstname,
      lastName: profile.lastname,
      profileImageUrl: profile.profile_medium,
    };
  }

  /**
   * Fetches all activities page by page.
   * Pass `options.after` to only retrieve activities after a given date
   * (used for incremental syncs — avoids re-fetching all history).
   */
  async getActivities(
    tokens: ProviderTokens,
    options: GetActivitiesOptions = {},
  ): Promise<Activity[]> {
    const { after, before, perPage = PAGE_SIZE } = options;

    const params: Record<string, string> = { per_page: String(perPage) };
    if (after) params['after'] = String(Math.floor(after.getTime() / 1000));
    if (before) params['before'] = String(Math.floor(before.getTime() / 1000));

    const all: Activity[] = [];
    let page = options.page ?? 1;

    while (true) {
      params['page'] = String(page);

      this.logger.debug(`Fetching Strava activities page ${page}`);

      const batch = await this.get<StravaSummaryActivity[]>(
        '/athlete/activities',
        tokens.accessToken,
        params,
      );

      if (!batch.length) break;

      // userId is not available at this layer — caller must set it after normalization
      // We pass empty string as a placeholder; sync jobs set the real userId on persist.
      for (const raw of batch) {
        all.push(normalizeSummaryActivity(raw, ''));
      }

      if (batch.length < perPage) break;

      page++;
      await sleep(PAGE_DELAY_MS);
    }

    this.logger.log(`Fetched ${all.length} activities from Strava`);
    return all;
  }

  /**
   * Fetches a single activity with full detail (laps) and streams.
   * Streams are fetched in a separate request and may be unavailable for
   * older or manually entered activities — failures are silently ignored.
   */
  async getActivityDetail(tokens: ProviderTokens, externalId: string): Promise<Activity> {
    const { activity } = await this.getActivityDetailWithRaw(tokens, externalId);
    return activity;
  }

  /**
   * Same as getActivityDetail but also returns the raw Strava API payloads
   * for storage in ActivityRawPayload (ADR-010).
   */
  async getActivityDetailWithRaw(
    tokens: ProviderTokens,
    externalId: string,
  ): Promise<{ activity: Activity; rawPayload: Record<string, unknown> }> {
    const [detail, streams] = await Promise.all([
      this.get<StravaDetailActivity>(`/activities/${externalId}`, tokens.accessToken),
      this.fetchStreams(tokens.accessToken, externalId),
    ]);

    const rawPayload: Record<string, unknown> = { detail };
    if (streams) rawPayload['streams'] = streams;

    return {
      activity: normalizeDetailActivity(detail, '', streams ?? undefined),
      rawPayload,
    };
  }

  /**
   * Paginated activity list with raw Strava summaries (for bulk import raw storage).
   */
  async getActivitiesWithRaw(
    tokens: ProviderTokens,
    options: GetActivitiesOptions = {},
  ): Promise<Array<{ activity: Activity; raw: StravaSummaryActivity }>> {
    const { after, before, perPage = PAGE_SIZE } = options;

    const params: Record<string, string> = { per_page: String(perPage) };
    if (after) params['after'] = String(Math.floor(after.getTime() / 1000));
    if (before) params['before'] = String(Math.floor(before.getTime() / 1000));

    const results: Array<{ activity: Activity; raw: StravaSummaryActivity }> = [];
    let page = options.page ?? 1;

    while (true) {
      params['page'] = String(page);
      const batch = await this.get<StravaSummaryActivity[]>(
        '/athlete/activities',
        tokens.accessToken,
        params,
      );
      if (!batch.length) break;

      for (const raw of batch) {
        results.push({ activity: normalizeSummaryActivity(raw, ''), raw });
      }

      if (batch.length < perPage) break;
      page++;
      await sleep(PAGE_DELAY_MS);
    }

    this.logger.log(`Fetched ${results.length} activities (with raw) from Strava`);
    return results;
  }

  async refreshTokens(tokens: ProviderTokens): Promise<ProviderTokens> {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env['STRAVA_CLIENT_ID'],
        client_secret: process.env['STRAVA_CLIENT_SECRET'],
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Strava token refresh failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as StravaTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    };
  }

  async revokeAccess(tokens: ProviderTokens): Promise<void> {
    const res = await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: tokens.accessToken }),
    });

    if (!res.ok) {
      this.logger.warn(`Strava deauthorize returned ${res.status} — ignoring`);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchStreams(
    accessToken: string,
    activityId: string,
  ): Promise<StravaStreamSet | null> {
    try {
      return await this.get<StravaStreamSet>(
        `/activities/${activityId}/streams`,
        accessToken,
        { keys: STREAM_KEYS, key_by_type: 'true' },
      );
    } catch (err) {
      // Streams are optional — some activities (manual, old) don't have them.
      this.logger.debug(`Could not fetch streams for activity ${activityId}: ${String(err)}`);
      return null;
    }
  }
}

// ── Custom error types ────────────────────────────────────────────────────────

export class StravaRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StravaRateLimitError';
  }
}

export class StravaUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StravaUnauthorizedError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
