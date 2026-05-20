import type { SportDistributionItem } from '@trainlens/shared';
import { formatDistance } from '@/lib/format';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#64748b'];

export function SportChart({ data }: { data: SportDistributionItem[] }) {
  if (!data.length) return <p className="text-sm text-gray-400">No activities yet.</p>;

  const total = data.reduce((s, d) => s + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <ul className="space-y-3">
      {sorted.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <li key={item.activityType}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-gray-700">{item.activityType}</span>
              <span className="text-gray-500">
                {item.count} · {formatDistance(item.distanceMeters)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
