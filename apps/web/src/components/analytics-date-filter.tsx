import Link from 'next/link';
import type { Route } from 'next';

export function AnalyticsDateFilter({
  basePath,
  from,
  to,
}: {
  basePath: Route;
  from: string;
  to: string;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
        De
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
        Até
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
      >
        Aplicar
      </button>
      <Link
        href={basePath}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        Últimos 3 meses
      </Link>
    </form>
  );
}
