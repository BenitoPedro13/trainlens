/**
 * Persistence helpers for OAuth provider connections.
 *
 * Token encryption (task 1.3 / 1.4) is applied here before writing to the DB.
 * Until task 1.4, tokens are stored as-is — replaced atomically when encryption
 * is wired in.
 */
import type { ProviderType } from '@trainlens/shared';
import { prisma } from '@/lib/db';

export interface UpsertConnectionParams {
  userId: string;
  provider: ProviderType;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  stravaAthleteId: string | null;
  scope?: string;
}

export async function upsertStravaConnection(params: UpsertConnectionParams): Promise<void> {
  const { userId, accessToken, refreshToken, expiresAt, stravaAthleteId, scope } = params;

  const athleteId = stravaAthleteId ?? 'unknown';

  await prisma.connection.upsert({
    where: {
      userId_provider: { userId, provider: 'strava' },
    },
    update: {
      // TODO (task 1.4): wrap with encryptToken() from packages/crypto
      encryptedAccessToken: accessToken,
      encryptedRefreshToken: refreshToken,
      tokenExpiresAt: new Date(expiresAt * 1000),
      externalAthleteId: athleteId,
      scope: scope ?? 'activity:read_all',
      status: 'active',
      updatedAt: new Date(),
    },
    create: {
      userId,
      provider: 'strava',
      // TODO (task 1.4): wrap with encryptToken() from packages/crypto
      encryptedAccessToken: accessToken,
      encryptedRefreshToken: refreshToken,
      tokenExpiresAt: new Date(expiresAt * 1000),
      externalAthleteId: athleteId,
      scope: scope ?? 'activity:read_all',
      status: 'active',
    },
  });
}
