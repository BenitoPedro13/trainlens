import type { BestEffortCandidate } from '@trainlens/shared';
import type { DatabaseService } from '../database/database.service';
import { resolveActivityLocalDateKey } from './activity-local-date.util';

type ActivityRow = {
  id: string;
  name: string;
  activityType: string;
  startedAt: Date;
  timezone: string | null;
  durationSeconds: number;
  distanceMeters: number | null;
};

export async function toBestEffortCandidates(
  db: DatabaseService,
  rows: ActivityRow[],
): Promise<BestEffortCandidate[]> {
  const needsRaw = rows.filter((r) => !r.timezone).map((r) => r.id);
  const rawById = new Map<string, unknown>();

  if (needsRaw.length > 0) {
    const raws = await db.client.activityRawPayload.findMany({
      where: { activityId: { in: needsRaw } },
      select: { activityId: true, payload: true },
    });
    for (const r of raws) rawById.set(r.activityId, r.payload);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    activityType: r.activityType,
    startedAt: r.startedAt,
    timezone: r.timezone,
    durationSeconds: r.durationSeconds,
    distanceMeters: r.distanceMeters,
    localDateKey: resolveActivityLocalDateKey(
      r.startedAt,
      r.timezone,
      rawById.get(r.id),
    ),
  }));
}
