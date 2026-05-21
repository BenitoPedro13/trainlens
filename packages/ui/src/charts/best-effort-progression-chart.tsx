'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BestEffortProgressionSeries } from '@trainlens/shared';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444'];

function formatDurationClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BestEffortProgressionChart({
  series,
}: {
  series: BestEffortProgressionSeries[];
}) {
  if (series.length === 0) {
    return <p className="text-sm text-gray-400">Sem histórico de PRs para mostrar.</p>;
  }

  return (
    <div className="space-y-8">
      {series.map((s, idx) => {
        const data = s.points.map((p) => ({
          date: p.achievedOnLocal,
          seconds: p.durationSeconds,
          estimated: p.isEstimated,
        }));
        return (
          <div key={s.label}>
            <h3 className="mb-2 text-sm font-medium text-gray-700">{s.label}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatDurationClock(v)}
                  reversed
                />
                <Tooltip
                  formatter={(v: number, _name, item) => {
                    const est = (item.payload as { estimated?: boolean }).estimated;
                    return [`${est ? '~' : ''}${formatDurationClock(v)}`, 'Tempo'];
                  }}
                  labelFormatter={(l) => `Data: ${l}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="seconds"
                  name="PR"
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
