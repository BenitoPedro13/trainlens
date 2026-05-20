import { auth } from '@/auth';
import { getZones } from '@/lib/api-client';
import { resolveDateRange } from '@/lib/analytics-dates';
import { AnalyticsDateFilter } from '@/components/analytics-date-filter';
import { AnalyticsSportFilter } from '@/components/analytics-sport-filter';
import { ZoneBars } from '@/components/charts/zone-bars';

export default async function ZonesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; activityType?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const { from, to } = resolveDateRange(searchParams);
  const activityType = searchParams.activityType;

  const zones = await getZones(
    userId,
    { from, to, ...(activityType ? { activityType } : {}) },
    email,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zonas</h1>
        <p className="mt-1 text-sm text-gray-500">
          FC a partir de streams quando disponível; ritmo por média da atividade.
        </p>
      </div>

      <AnalyticsDateFilter basePath="/analytics/zones" from={from} to={to} />
      <AnalyticsSportFilter
        basePath="/analytics/zones"
        {...(activityType ? { activityType } : {})}
        extraParams={{ from, to }}
      />

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
