import type { WeeklyVolumePoint } from '@trainlens/shared';
import { formatDistance } from '@/lib/format';

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400">No data for this period.</p>;
  }

  const max = Math.max(...data.map((d) => d.distanceMeters), 1);

  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((week) => (
        <div key={week.weekStart} className="group flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-orange-500 transition hover:bg-orange-600"
            style={{ height: `${Math.max(4, (week.distanceMeters / max) * 140)}px` }}
            title={`${week.weekStart}: ${formatDistance(week.distanceMeters)}`}
          />
          <span className="hidden text-[10px] text-gray-400 group-hover:block">
            {new Date(week.weekStart).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  );
}
