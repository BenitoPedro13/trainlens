'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useActivities } from '@/lib/use-activities';
import { ACTIVITY_TYPES } from '@/lib/activity-types';
import { formatDate, formatDistance, formatDuration } from '@/lib/format';

export function ActivitiesListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const activityType = searchParams.get('activityType') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const params: Parameters<typeof useActivities>[0] = { page };
  if (activityType) params.activityType = activityType;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data, isFetching } = useActivities(params);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`/activities?${params.toString()}`);
    },
    [router, searchParams],
  );

  const hasFilters = Boolean(activityType || from || to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Modalidade
          <select
            value={activityType ?? ''}
            onChange={(e) => updateFilter('activityType', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Todas</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          De
          <input
            type="date"
            value={from ?? ''}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Até
          <input
            type="date"
            value={to ?? ''}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
        </label>

        {hasFilters && (
          <button
            onClick={() => router.push('/activities')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </button>
        )}

        {isFetching && (
          <span className="ml-auto text-xs text-gray-400">Carregando...</span>
        )}
      </div>

      {!data ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Carregando atividades...
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          {hasFilters
            ? 'Nenhuma atividade corresponde aos filtros.'
            : 'Nenhuma atividade ainda. Conecte o Strava para sincronizar.'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {data.items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/activities/${a.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(a.startedAt)} · {a.activityType}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDistance(a.distanceMeters)} · {formatDuration(a.durationSeconds)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <button
              onClick={() => updateFilter('page', String(page - 1))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Anterior
            </button>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Página {page} de {data.totalPages}
          </span>
          {page < data.totalPages && (
            <button
              onClick={() => updateFilter('page', String(page + 1))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Próxima
            </button>
          )}
        </div>
      )}
    </div>
  );
}
