import { auth } from '@/auth';
import { getTrainingLoad } from '@/lib/api-client';
import { resolveDateRange } from '@/lib/analytics-dates';
import { AnalyticsDateFilter } from '@/components/analytics-date-filter';
import { TrainingLoadChart } from '@/components/charts/training-load-chart';
import { StatCard } from '@/components/stat-card';

export default async function TrainingLoadPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const { from, to } = resolveDateRange(searchParams);

  const { points } = await getTrainingLoad(userId, { from, to }, email);
  const latest = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training load</h1>
        <p className="mt-1 text-sm text-gray-500">CTL, ATL e TSB — gestão de carga de treino.</p>
      </div>

      <AnalyticsDateFilter basePath="/analytics/training-load" from={from} to={to} />

      {latest && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="CTL (fitness)" value={String(latest.ctl)} />
          <StatCard label="ATL (fadiga)" value={String(latest.atl)} />
          <StatCard
            label="TSB (forma)"
            value={String(latest.tsb)}
            sub={latest.tsb >= 0 ? 'Fresco' : 'Fadigado'}
          />
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Performance Management Chart</h2>
        <TrainingLoadChart points={points} />
      </section>
    </div>
  );
}
