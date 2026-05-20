import Link from 'next/link';
import { auth } from '@/auth';
import { getYearOverYear } from '@/lib/api-client';
import { resolveDateRange } from '@/lib/analytics-dates';
import { AnalyticsDateFilter } from '@/components/analytics-date-filter';
import { YearOverYearChart } from '@/components/charts/yoy-chart';

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const mode = searchParams.mode === 'month' ? 'month' : 'week';
  const { from, to } = resolveDateRange(searchParams);

  const { points } = await getYearOverYear(userId, { mode, from, to }, email);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progresso</h1>
          <p className="mt-1 text-sm text-gray-500">Comparação ano a ano (distância por semana/mês).</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/analytics/progress?mode=week"
            className={`rounded-lg px-3 py-1.5 text-sm ${mode === 'week' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Semanal
          </Link>
          <Link
            href="/analytics/progress?mode=month"
            className={`rounded-lg px-3 py-1.5 text-sm ${mode === 'month' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Mensal
          </Link>
        </div>
      </div>

      <AnalyticsDateFilter basePath="/analytics/progress" from={from} to={to} />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Distância (km) — por ano</h2>
        <YearOverYearChart points={points} mode={mode} />
      </section>
    </div>
  );
}
