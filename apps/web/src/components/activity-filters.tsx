import Link from 'next/link';
import type { Route } from 'next';
import { ACTIVITY_TYPES } from '@/lib/activity-types';
import { buildActivitiesHref, hasActivityFilters, type ActivitiesQuery } from '@/lib/activities-query';

export function ActivityFilters({ query }: { query: ActivitiesQuery }) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
        Modalidade
        <select
          name="activityType"
          defaultValue={query.activityType ?? ''}
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
          name="from"
          defaultValue={query.from ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
        Até
        <input
          type="date"
          name="to"
          defaultValue={query.to ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
      >
        Filtrar
      </button>

      {hasActivityFilters(query) && (
        <Link
          href="/activities"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Limpar
        </Link>
      )}
    </form>
  );
}

/** Hidden helper for pagination links — preserves filters, changes page. */
export function activitiesPageHref(query: ActivitiesQuery, page: number): Route {
  return buildActivitiesHref(query, { page: String(page) });
}
