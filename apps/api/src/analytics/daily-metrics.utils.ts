export interface DayAggregate {
  totalActivities: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalElevationGainMeters: number;
  totalCalories: number;
  tss: number;
}

export interface ActivityMetricsInput {
  startedAt: Date;
  distanceMeters: number | null;
  durationSeconds: number;
  elevationGainMeters: number | null;
  calories: number | null;
  tss: number | null;
}

export function aggregateActivitiesByDay(
  activities: ActivityMetricsInput[],
): Map<string, DayAggregate> {
  const byDate = new Map<string, DayAggregate>();

  for (const a of activities) {
    const dateKey = a.startedAt.toISOString().slice(0, 10);
    const agg = byDate.get(dateKey) ?? {
      totalActivities: 0,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalElevationGainMeters: 0,
      totalCalories: 0,
      tss: 0,
    };
    agg.totalActivities += 1;
    agg.totalDistanceMeters += a.distanceMeters ?? 0;
    agg.totalDurationSeconds += a.durationSeconds;
    agg.totalElevationGainMeters += a.elevationGainMeters ?? 0;
    agg.totalCalories += a.calories ?? 0;
    agg.tss += a.tss ?? 0;
    byDate.set(dateKey, agg);
  }

  return byDate;
}

export function computeStreaks(activeDates: Date[]): { current: number; longest: number } {
  if (!activeDates.length) return { current: 0, longest: 0 };

  const daySet = new Set(activeDates.map((d) => d.toISOString().slice(0, 10)));
  const sorted = [...daySet].sort();

  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of sorted) {
    if (prev) {
      const prevDate = new Date(`${prev}T00:00:00.000Z`);
      const currDate = new Date(`${day}T00:00:00.000Z`);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
      if (diffDays === 1) {
        run += 1;
      } else {
        longest = Math.max(longest, run);
        run = 1;
      }
    } else {
      run = 1;
    }
    prev = day;
  }
  longest = Math.max(longest, run);

  let current = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let cursor = today.toISOString().slice(0, 10);

  while (daySet.has(cursor)) {
    current += 1;
    const d = new Date(`${cursor}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  return { current, longest };
}
