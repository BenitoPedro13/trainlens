import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getSegment, ApiError } from '@/lib/api-client';
import { SegmentEffortChart } from '@/components/charts/segment-effort-chart';

function formatDuration(seconds: number): string {
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
          { label: 'Melhor tempo', value: pr ? formatDuration(pr.elapsedSeconds) : '—' },
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

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
          Todos os esforços
        </h2>
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Tempo</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">FC média</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Potência</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Rank PR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {segment.efforts.map((effort) => (
              <tr key={effort.id} className={effort.id === pr?.id ? 'bg-orange-50' : ''}>
                <td className="px-4 py-2.5 text-gray-600">
                  {new Date(effort.startDate).toLocaleDateString('pt-BR')}
                  {effort.id === pr?.id && (
                    <span className="ml-2 rounded bg-orange-100 px-1 text-xs text-orange-700">PR</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                  {formatDuration(effort.elapsedSeconds)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {effort.averageHeartRate != null ? `${Math.round(effort.averageHeartRate)} bpm` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {effort.averageWatts != null ? `${Math.round(effort.averageWatts)} W` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {effort.prRank != null ? `#${effort.prRank}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
