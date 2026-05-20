import Link from 'next/link';
import { auth } from '@/auth';
import { getBestEfforts } from '@/lib/api-client';
import { formatDate, formatDurationClock } from '@/lib/format';

export default async function BestEffortsPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;

  const { efforts } = await getBestEfforts(userId, undefined, email);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Best efforts</h1>
        <p className="mt-1 text-sm text-gray-500">Melhores tempos estimados por distância (corrida).</p>
      </div>

      {efforts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          Sem PRs calculados. Sincronize corridas com distância GPS.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Distância</th>
                <th className="px-4 py-3">Tempo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {efforts.map((e) => (
                <tr key={e.label} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.label}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{formatDurationClock(e.durationSeconds)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(e.achievedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/activities/${e.activityId}`} className="text-orange-600 hover:text-orange-700">
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
