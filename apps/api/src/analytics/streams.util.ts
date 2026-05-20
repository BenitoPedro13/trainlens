/** Extract heartrate stream samples from stored Strava raw payload. */
export function extractHeartrateStream(
  payload: unknown,
): { heartrate: number[]; timeSeconds?: number[] } | null {
  if (!payload || typeof payload !== 'object') return null;
  const streams = (payload as Record<string, unknown>)['streams'];
  if (!streams || typeof streams !== 'object') return null;

  const set = streams as Record<string, { data?: number[] } | undefined>;
  const hr = set['heartrate']?.data;
  if (!Array.isArray(hr) || hr.length === 0) return null;

  const time = set['time']?.data;
  return {
    heartrate: hr,
    ...(Array.isArray(time) && time.length > 0 ? { timeSeconds: time } : {}),
  };
}
