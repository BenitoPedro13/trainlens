/**
 * Strava token refresh helper.
 *
 * Called from the Auth.js jwt callback when the stored access token is within
 * 5 minutes of expiring. Strava refresh tokens do not expire, so we can always
 * exchange them for a fresh access token.
 *
 * Docs: https://developers.strava.com/docs/authentication/#refreshingexpiredaccesstokens
 */

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
  expires_in: number;
  token_type: string;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function refreshStravaTokens(
  currentRefreshToken: string,
): Promise<RefreshedTokens> {
  const clientId = process.env['STRAVA_CLIENT_ID'];
  const clientSecret = process.env['STRAVA_CLIENT_SECRET'];

  if (!clientId || !clientSecret) {
    throw new Error('STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET env vars are not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken,
  });

  const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as RefreshResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

/**
 * Returns true if the token expires within the given buffer (default 5 min).
 */
export function isTokenExpiringSoon(
  expiresAtSeconds: number,
  bufferSeconds = 5 * 60,
): boolean {
  return Date.now() / 1000 > expiresAtSeconds - bufferSeconds;
}
