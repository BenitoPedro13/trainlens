export interface YearOverYearInputRow {
  startedAt: Date;
  distanceMeters: number | null;
  tss: number | null;
}

export interface YearOverYearBucket {
  period: string;
  year: number;
  weekOrMonth: number;
  distanceMeters: number;
  activityCount: number;
  tss: number;
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Aggregate distance, count, and TSS by ISO week or calendar month.
 */
export function computeYearOverYear(
  activities: YearOverYearInputRow[],
  mode: 'week' | 'month' = 'week',
): YearOverYearBucket[] {
  const map = new Map<string, YearOverYearBucket>();

  for (const a of activities) {
    let year: number;
    let periodNum: number;
    let period: string;

    if (mode === 'month') {
      year = a.startedAt.getUTCFullYear();
      periodNum = a.startedAt.getUTCMonth() + 1;
      period = `${year}-M${String(periodNum).padStart(2, '0')}`;
    } else {
      const w = isoWeek(a.startedAt);
      year = w.year;
      periodNum = w.week;
      period = `${year}-W${String(periodNum).padStart(2, '0')}`;
    }

    const bucket = map.get(period) ?? {
      period,
      year,
      weekOrMonth: periodNum,
      distanceMeters: 0,
      activityCount: 0,
      tss: 0,
    };
    bucket.activityCount += 1;
    bucket.distanceMeters += a.distanceMeters ?? 0;
    bucket.tss += a.tss ?? 0;
    map.set(period, bucket);
  }

  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}
