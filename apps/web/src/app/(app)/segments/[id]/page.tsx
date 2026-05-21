import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getSegment, ApiError } from '@/lib/api-client';
import { SegmentEffortChart } from '@/components/charts/segment-effort-chart';
import { SegmentEffortCompare } from '@/components/segment-effort-compare';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  let segment;
  try {
    segment = await getSegment(session.user.id, params.id, session.user.email);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const pr = segment.efforts.reduce<(typeof segment.efforts)[0] | null>(
    (best, e) => (!best || e.elapsedSeconds < best.elapsedSeconds ? e : best),
    null,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/segments" className="text-sm text-gray-400 hover:text-gray-600">
          ← Segmentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{segment.name}</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
          <span>{segment.activityType}</span>
          <span>·</span>
          <span>{formatDistance(segment.distanceMeters)}</span>
          {segment.averageGrade != null && (
            <>
              <span>·</span>
              <span>{segment.averageGrade.toFixed(1)}% inclinação média</span>
            </>
          )}
          {segment.city && (
            <>
              <span>·</span>
              <span>{[segment.city, segment.country].filter(Boolean).join(', ')}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Melhor tempo', value: pr ? fmt(pr.elapsedSeconds) : '—' },
          { label: 'Esforços', value: String(segment.efforts.length) },
          { label: 'Incl. máxima', value: segment.maximumGrade != null ? `${segment.maximumGrade.toFixed(1)}%` : '—' },
          { label: 'Alt. máxima', value: segment.elevationHigh != null ? `${Math.round(segment.elevationHigh)} m` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {segment.efforts.length > 1 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Progressão de tempos</h2>
          <SegmentEffortChart efforts={segment.efforts} />
        </section>
      )}

      <SegmentEffortCompare
        segmentId={segment.id}
        userId={session.user.id}
        email={session.user.email}
        efforts={segment.efforts}
        prId={pr?.id ?? null}
      />
    </div>
  );
}
