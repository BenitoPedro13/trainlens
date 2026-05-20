import { prisma } from '@/lib/db';

export async function getUserSettings(userId: string) {
  const [user, connection] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, createdAt: true },
    }),
    prisma.connection.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
      select: {
        status: true,
        externalAthleteId: true,
        lastSyncedAt: true,
        createdAt: true,
        syncErrorMessage: true,
      },
    }),
  ]);

  return { user, connection };
}
