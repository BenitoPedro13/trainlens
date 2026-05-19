import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Strava from 'next-auth/providers/strava';
import { prisma } from '@/lib/db';
import { upsertStravaConnection } from '@/lib/connections';
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
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },

    // ── session ───────────────────────────────────────────────────────────────
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },

    // ── signIn ────────────────────────────────────────────────────────────────
    // After Strava OAuth, persist (encrypted in task 1.4) tokens to Connection.
    async signIn({ user, account, profile }) {
      if (account?.provider === 'strava') {
        const userId = user.id;
        if (!userId) return false;

        const stravaProfile = profile as Record<string, unknown>;
        const athleteId =
          typeof stravaProfile['id'] === 'number' ? String(stravaProfile['id']) : null;

        await upsertStravaConnection({
          userId,
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
