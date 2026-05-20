'use client';

type HeatmapCell = { date: string; count: number; distanceMeters: number };

function level(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const LEVEL_CLASS = [
  'bg-gray-100',
  'bg-orange-200',
  'bg-orange-400',
  'bg-orange-500',
  'bg-orange-600',
];

export function ActivityHeatmap({ data, year }: { data: HeatmapCell[]; year: number }) {
  const byDate = new Map(data.map((d) => [d.date, d]));
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const startDay = start.getUTCDay();
  const pad = startDay === 0 ? 6 : startDay - 1;
  const gridStart = new Date(start);
  gridStart.setUTCDate(gridStart.getUTCDate() - pad);

  const weeks: HeatmapCell[][] = [];
  let week: HeatmapCell[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= end || week.length > 0) {
    const key = cursor.toISOString().slice(0, 10);
    const inYear = cursor.getUTCFullYear() === year;
    week.push(
      inYear
        ? (byDate.get(key) ?? { date: key, count: 0, distanceMeters: 0 })
        : { date: key, count: -1, distanceMeters: 0 },
    );

    if (cursor.getUTCDay() === 0) {
      weeks.push(week);
      week = [];
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor > end && week.length === 0) break;
    if (cursor > end && cursor.getUTCDay() === 1 && weeks[weeks.length - 1]?.length === 7) break;
  }

  if (week.length) weeks.push(week);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {w.map((cell) => {
              if (cell.count < 0) {
                return <div key={cell.date} className="h-3 w-3 rounded-sm bg-transparent" />;
              }
              const lvl = level(cell.count, maxCount);
              return (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} atividade(s)`}
                  className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[lvl]}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">{year} · atividades por dia</p>
    </div>
  );
}
