import { auth } from '@/auth';
import { getZones } from '@/lib/api-client';
import { resolveDateRange } from '@/lib/analytics-dates';
import { AnalyticsDateFilter } from '@/components/analytics-date-filter';
import { ZoneBars } from '@/components/charts/zone-bars';

export default async function ZonesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const { from, to } = resolveDateRange(searchParams);

  const zones = await getZones(userId, { from, to }, email);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zonas</h1>
        <p className="mt-1 text-sm text-gray-500">Distribuição de tempo por zona (estimativa por atividade).</p>
      </div>

      <AnalyticsDateFilter basePath="/analytics/zones" from={from} to={to} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Frequência cardíaca</h2>
          <ZoneBars data={zones.heartRate} valueKey="percentOfTotal" unit="%" />
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Ritmo</h2>
          <ZoneBars data={zones.pace} valueKey="percentOfTotal" unit="%" />
        </section>
      </div>
    </div>
  );
}
