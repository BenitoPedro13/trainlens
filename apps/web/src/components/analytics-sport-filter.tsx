import Link from 'next/link';
import type { Route } from 'next';

const SPORTS = [
  { value: '', label: 'Todas' },
  { value: 'Run', label: 'Corrida' },
  { value: 'Ride', label: 'Ciclismo' },
] as const;

export function AnalyticsSportFilter({
  basePath,
  activityType,
  extraParams,
}: {
  basePath: Route;
  activityType?: string;
  extraParams?: Record<string, string>;
}) {
  const q = new URLSearchParams(extraParams ?? {});
  if (activityType) q.set('activityType', activityType);

  return (
    <div className="flex flex-wrap gap-2">
      {SPORTS.map((s) => {
        const params = new URLSearchParams(extraParams ?? {});
        if (s.value) params.set('activityType', s.value);
        else params.delete('activityType');
        const href = params.toString() ? `${basePath}?${params}` : basePath;
        const active = (activityType ?? '') === s.value;
        return (
          <Link
            key={s.value || 'all'}
            href={href as Route}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              active
                ? 'bg-orange-500 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
