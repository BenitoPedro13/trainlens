import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe subset of the auth config — no Prisma, no Node.js-only deps.
 * Used by middleware (Edge Runtime). The full config lives in auth.ts.
 */
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [],
} satisfies NextAuthConfig;
