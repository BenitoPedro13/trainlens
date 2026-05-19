import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Unix timestamp (seconds) when the Strava access token expires. */
    stravaExpiresAt?: number;
  }
}
