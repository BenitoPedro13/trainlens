import type { ActivityLap } from '@trainlens/shared';
import { formatDuration, formatDistance, formatPace } from '@/lib/format';

export function ActivityLapsTable({ laps }: { laps: ActivityLap[] }) {
  if (laps.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Voltas</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Distância</th>
              <th className="py-2 pr-4">Tempo</th>
              <th className="py-2 pr-4">Ritmo</th>
              <th className="py-2 pr-4">FC média</th>
              <th className="py-2">Potência</th>
            </tr>
          </thead>
          <tbody>
            {laps.map((lap) => (
              <tr key={lap.index} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-900">{lap.index + 1}</td>
                <td className="py-2 pr-4 text-gray-700">{formatDistance(lap.distanceMeters)}</td>
                <td className="py-2 pr-4 text-gray-700">{formatDuration(lap.durationSeconds)}</td>
                <td className="py-2 pr-4 text-gray-700">
                  {formatPace(lap.averagePaceSecondsPerKm)}
                </td>
                <td className="py-2 pr-4 text-gray-700">
                  {lap.averageHeartRate != null ? `${Math.round(lap.averageHeartRate)} bpm` : '—'}
                </td>
                <td className="py-2 text-gray-700">
                  {lap.averagePowerWatts != null
                    ? `${Math.round(lap.averagePowerWatts)} W`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
