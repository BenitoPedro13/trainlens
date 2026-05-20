import { Injectable } from '@nestjs/common';
import type { ProviderTokens } from '@trainlens/shared';
import { decryptToken, encryptToken } from '@trainlens/shared';
import { DatabaseService } from '../database/database.service';

export interface StravaConnectionTokens extends ProviderTokens {
  connectionId: string;
}

@Injectable()
export class ConnectionTokensService {
  constructor(private readonly db: DatabaseService) {}

  async getStravaTokens(userId: string): Promise<StravaConnectionTokens | null> {
    const conn = await this.db.client.connection.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
    });
    if (!conn) return null;

    return {
      connectionId: conn.id,
      accessToken: decryptToken(conn.encryptedAccessToken),
      ...(conn.encryptedRefreshToken && {
        refreshToken: decryptToken(conn.encryptedRefreshToken),
      }),
      ...(conn.tokenExpiresAt && { expiresAt: conn.tokenExpiresAt }),
    };
  }

  async updateStravaTokens(userId: string, tokens: ProviderTokens): Promise<void> {
    await this.db.client.connection.update({
      where: { userId_provider: { userId, provider: 'strava' } },
      data: {
        encryptedAccessToken: encryptToken(tokens.accessToken),
        encryptedRefreshToken: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null,
        tokenExpiresAt: tokens.expiresAt ?? null,
        status: 'active',
        syncErrorMessage: null,
      },
    });
  }

  async markSyncError(userId: string, message: string): Promise<void> {
    await this.db.client.connection.update({
      where: { userId_provider: { userId, provider: 'strava' } },
      data: { status: 'error', syncErrorMessage: message },
    });
  }
}
