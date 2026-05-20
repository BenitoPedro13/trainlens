import type { ActivityLap } from '@trainlens/shared';
import { normalizeLap } from '../strava/strava.normalizer';
import type { StravaLap } from '../strava/strava.types';

export function extractLapsFromRawPayload(payload: unknown): ActivityLap[] | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const root = payload as Record<string, unknown>;
  const detail = root['detail'] as Record<string, unknown> | undefined;
  const summary = root['summary'] as Record<string, unknown> | undefined;
  const lapsRaw = (detail?.['laps'] ?? summary?.['laps']) as StravaLap[] | undefined;

  if (!Array.isArray(lapsRaw) || lapsRaw.length === 0) return undefined;
  return lapsRaw.map((lap) => normalizeLap(lap));
}
