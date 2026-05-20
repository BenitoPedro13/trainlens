import Link from 'next/link';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getActivity } from '@/lib/api-client';
import { ActivityLapsTable } from '@/components/activity-laps-table';
import { formatDate, formatDistance, formatDuration, formatPace } from '@/lib/format';

const ActivityMap = dynamic(
  () => import('@/components/activity-map').then((m) => m.ActivityMap),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> },
);

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;

  let activity;
  try {
    activity = await getActivity(userId, params.id, email);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/activities" className="text-sm text-orange-600 hover:text-orange-700">
        ← Voltar
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatDate(activity.startedAt)} · {activity.activityType}
          {activity.deviceName ? ` · ${activity.deviceName}` : ''}
        </p>
      </header>

      {activity.summaryPolyline && <ActivityMap encoded={activity.summaryPolyline} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailStat label="Distância" value={formatDistance(activity.distanceMeters)} />
        <DetailStat label="Duração" value={formatDuration(activity.durationSeconds)} />
        <DetailStat label="Ritmo médio" value={formatPace(activity.averagePaceSecondsPerKm)} />
        <DetailStat
          label="Elevação"
          value={
            activity.elevationGainMeters != null
              ? `${Math.round(activity.elevationGainMeters)} m`
              : '—'
          }
        />
        {activity.averageHeartRate != null && (
          <DetailStat label="FC média" value={`${Math.round(activity.averageHeartRate)} bpm`} />
        )}
        {activity.maxHeartRate != null && (
          <DetailStat label="FC máx" value={`${Math.round(activity.maxHeartRate)} bpm`} />
        )}
        {activity.averagePowerWatts != null && (
          <DetailStat label="Potência média" value={`${Math.round(activity.averagePowerWatts)} W`} />
        )}
        {activity.calories != null && (
          <DetailStat label="Calorias" value={String(Math.round(activity.calories))} />
        )}
      </div>

      {activity.laps && activity.laps.length > 0 && (
        <ActivityLapsTable laps={activity.laps} />
      )}

      {activity.description && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          {activity.description}
        </section>
      )}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
