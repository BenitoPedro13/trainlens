import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Strava from 'next-auth/providers/strava';
import { prisma } from '@/lib/db';
import { upsertStravaConnection, getStravaTokens } from '@/lib/connections';
import { refreshStravaTokens, isTokenExpiringSoon } from '@/lib/strava-refresh';
import { compare, hash } from 'bcryptjs';

const config: NextAuthConfig = {
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    // ── Credentials (dev convenience) ────────────────────────────────────────
    // In production users authenticate exclusively via Strava.
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          typeof credentials.email !== 'string' ||
          !credentials?.password ||
          typeof credentials.password !== 'string'
        ) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          const passwordHash = await hash(credentials.password, 12);
          user = await prisma.user.create({ data: { email, passwordHash } });
        } else {
          if (!user.passwordHash) return null;
          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) return null;
        }

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),

    // ── Strava OAuth ──────────────────────────────────────────────────────────
    Strava({
      clientId: process.env['STRAVA_CLIENT_ID'] ?? '',
      clientSecret: process.env['STRAVA_CLIENT_SECRET'] ?? '',
      authorization: {
        params: {
          scope: 'activity:read_all',
          approval_prompt: 'auto',
          response_type: 'code',
        },
      },
    }),
  ],

  callbacks: {
    // ── jwt ───────────────────────────────────────────────────────────────────
    // Runs on every session access. Refreshes Strava tokens when they are
    // within 5 minutes of expiry.
    async jwt({ token, user, account }) {
      // First sign-in: propagate userId and initial Strava expiry.
      if (user?.id) token.sub = user.id;
      if (account?.provider === 'strava' && account.expires_at) {
        token.stravaExpiresAt = account.expires_at;
      }

      // Not a Strava session — nothing to refresh.
      if (!token.stravaExpiresAt || !token.sub) return token;

      // Token still valid → return as-is.
      if (!isTokenExpiringSoon(token.stravaExpiresAt as number)) return token;

      // Token expiring soon → refresh.
      try {
        const stored = await getStravaTokens(token.sub);
        if (!stored?.refreshToken) return token;

        const refreshed = await refreshStravaTokens(stored.refreshToken);

        // Persist new tokens encrypted.
        await upsertStravaConnection({
          userId: token.sub,
          provider: 'strava',
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: refreshed.expiresAt,
          stravaAthleteId: null,
        });

        token.stravaExpiresAt = refreshed.expiresAt;
      } catch (err) {
        // Log and return stale token rather than breaking the session.
        console.error('[auth] Strava token refresh failed:', err);
      }

      return token;
    },

    // ── session ───────────────────────────────────────────────────────────────
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },

    // ── signIn ────────────────────────────────────────────────────────────────
    // After Strava OAuth, find-or-create the User in the DB (JWT strategy does
    // not persist users automatically), then store encrypted tokens.
    // user.id is overwritten with the real DB CUID so the jwt callback picks it up.
    async signIn({ user, account, profile }) {
      if (account?.provider === 'strava') {
        if (!user.email) return false;

        const stravaProfile = profile as Record<string, unknown>;
        const athleteId =
          typeof stravaProfile['id'] === 'number' ? String(stravaProfile['id']) : null;

        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            ...(user.name != null && { name: user.name }),
            ...(user.image != null && { image: user.image }),
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });

        user.id = dbUser.id;

        await upsertStravaConnection({
          userId: dbUser.id,
          provider: 'strava',
          accessToken: account.access_token ?? '',
          refreshToken: account.refresh_token ?? '',
          expiresAt: account.expires_at ?? 0,
          stravaAthleteId: athleteId,
        });
      }
      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
