import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { listSegments } from '@/lib/api-client';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function climbLabel(category: number | null): string {
  if (category == null || category === 0) return '';
  return `Cat. ${category}`;
}

export default async function SegmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const segments = await listSegments(session.user.id, session.user.email);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Segmentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Segmentos Strava dos seus treinos, com o seu melhor tempo.
        </p>
      </div>

      {segments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          Nenhum segmento ainda. Sincronize atividades do Strava para ver os seus segmentos aqui.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Segmento</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Dist.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Incl.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Melhor tempo</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Esforços</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {segments.map((seg) => (
                <tr key={seg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/segments/${seg.id}`} className="font-medium text-gray-900 hover:text-orange-600">
                      {seg.name}
                    </Link>
                    <div className="mt-0.5 flex gap-2 text-xs text-gray-400">
                      <span>{seg.activityType}</span>
                      {seg.city && <span>· {seg.city}</span>}
                      {climbLabel(seg.climbCategory) && (
                        <span className="rounded bg-orange-100 px-1 text-orange-700">
                          {climbLabel(seg.climbCategory)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatDistance(seg.distanceMeters)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {seg.averageGrade != null ? `${seg.averageGrade.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {seg.prElapsedSeconds != null ? formatDuration(seg.prElapsedSeconds) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{seg.effortCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
