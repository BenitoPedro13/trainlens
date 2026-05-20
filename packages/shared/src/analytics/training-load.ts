export interface DailyTssPoint {
  date: string;
  tss: number;
}

export interface TrainingLoadPoint {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export const CTL_TIME_CONSTANT = 42;
export const ATL_TIME_CONSTANT = 7;

/**
 * Exponential moving averages for CTL (42d), ATL (7d), and TSB.
 * Missing days in the input should be filled with tss=0 before calling.
 */
export function computeTrainingLoadSeries(dailyTss: DailyTssPoint[]): TrainingLoadPoint[] {
  if (!dailyTss.length) return [];

  const sorted = [...dailyTss].sort((a, b) => a.date.localeCompare(b.date));
  const points: TrainingLoadPoint[] = [];

  let ctl = 0;
  let atl = 0;

  for (const day of sorted) {
    const tss = day.tss;
    ctl = ctl + (tss - ctl) / CTL_TIME_CONSTANT;
    atl = atl + (tss - atl) / ATL_TIME_CONSTANT;
    points.push({
      date: day.date,
      tss,
      ctl: round1(ctl),
      atl: round1(atl),
      tsb: round1(ctl - atl),
    });
  }

  return points;
}

/** Build a continuous daily timeline with zeros for rest days. */
export function fillDailyTssTimeline(
  dailyTss: Map<string, number>,
  fromDate: string,
  toDate: string,
): DailyTssPoint[] {
  const result: DailyTssPoint[] = [];
  const cursor = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, tss: dailyTss.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
