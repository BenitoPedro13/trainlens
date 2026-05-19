/**
 * Persistence helpers for OAuth provider connections.
 *
 * All tokens are encrypted with AES-256-GCM envelope encryption (ADR-011)
 * using encryptToken / decryptToken from @trainlens/shared before storage.
 */
import type { ProviderType } from '@trainlens/shared';
import { encryptToken, decryptToken } from '@trainlens/shared';
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

export interface DecryptedTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
}

export async function getStravaTokens(userId: string): Promise<DecryptedTokens | null> {
  const conn = await prisma.connection.findUnique({
    where: { userId_provider: { userId, provider: 'strava' } },
    select: {
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      tokenExpiresAt: true,
    },
  });
  if (!conn) return null;

  return {
    accessToken: decryptToken(conn.encryptedAccessToken),
    refreshToken: conn.encryptedRefreshToken ? decryptToken(conn.encryptedRefreshToken) : '',
    tokenExpiresAt: conn.tokenExpiresAt,
  };
}

export async function upsertStravaConnection(params: UpsertConnectionParams): Promise<void> {
  const { userId, accessToken, refreshToken, expiresAt, stravaAthleteId, scope } = params;

  const athleteId = stravaAthleteId ?? 'unknown';
  const encAccessToken = encryptToken(accessToken);
  const encRefreshToken = encryptToken(refreshToken);

  await prisma.connection.upsert({
    where: {
      userId_provider: { userId, provider: 'strava' },
    },
    update: {
      encryptedAccessToken: encAccessToken,
      encryptedRefreshToken: encRefreshToken,
      tokenExpiresAt: new Date(expiresAt * 1000),
      externalAthleteId: athleteId,
      scope: scope ?? 'activity:read_all',
      status: 'active',
      updatedAt: new Date(),
    },
    create: {
      userId,
      provider: 'strava',
      encryptedAccessToken: encAccessToken,
      encryptedRefreshToken: encRefreshToken,
      tokenExpiresAt: new Date(expiresAt * 1000),
      externalAthleteId: athleteId,
      scope: scope ?? 'activity:read_all',
      status: 'active',
    },
  });
}
