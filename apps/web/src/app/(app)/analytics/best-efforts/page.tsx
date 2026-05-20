import Link from 'next/link';
import { auth } from '@/auth';
import { getBestEfforts, getBestEffortProgression } from '@/lib/api-client';
import { resolveDateRange } from '@/lib/analytics-dates';
import { AnalyticsDateFilter } from '@/components/analytics-date-filter';
import { AnalyticsSportFilter } from '@/components/analytics-sport-filter';
import { BestEffortProgressionChart } from '@/components/charts/best-effort-progression-chart';
import { formatCalendarDate, formatDurationClock } from '@/lib/format';

export default async function BestEffortsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; activityType?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const { from, to } = resolveDateRange(searchParams);
  const activityType = searchParams.activityType;

  const [{ efforts }, { series }] = await Promise.all([
    getBestEfforts(userId, activityType, email),
    getBestEffortProgression(
      userId,
      { from, to, ...(activityType ? { activityType } : {}) },
      email,
    ),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Best efforts</h1>
        <p className="mt-1 text-sm text-gray-500">
          PRs por distância. Tempos com ~ são estimados a partir de uma corrida mais longa.
        </p>
      </div>

      <AnalyticsDateFilter basePath="/analytics/best-efforts" from={from} to={to} />
      <AnalyticsSportFilter
        basePath="/analytics/best-efforts"
        {...(activityType ? { activityType } : {})}
        extraParams={{ from, to }}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Evolução dos PRs</h2>
        <BestEffortProgressionChart series={series} />
      </section>

      {efforts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          Sem PRs calculados. Sincronize corridas com distância GPS.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
            Melhores tempos actuais
          </h2>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Distância</th>
                <th className="px-4 py-3">Tempo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {efforts.map((e) => (
                <tr key={e.label} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.label}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">
                    {e.isEstimated ? '~' : ''}
                    {formatDurationClock(e.durationSeconds)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatCalendarDate(e.achievedOnLocal)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.activityName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/activities/${e.activityId}`}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
