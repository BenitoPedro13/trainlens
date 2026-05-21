'use client';

import type { YearOverYearPoint } from '@trainlens/shared';
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

export function YearOverYearChart({
  points,
  mode = 'week',
}: {
  points: YearOverYearPoint[];
  mode?: 'week' | 'month';
}) {
  if (!points.length) {
    return <p className="text-sm text-gray-400">Sem dados comparativos.</p>;
  }

  const years = [...new Set(points.map((p) => p.year))].sort();
  const periods = [...new Set(points.map((p) => p.weekOrMonth))].sort((a, b) => a - b);

  const data = periods.map((period) => {
    const row: Record<string, string | number> = {
      period: mode === 'month' ? `M${period}` : `S${period}`,
    };
    for (const year of years) {
      const match = points.find((p) => p.year === year && p.weekOrMonth === period);
      row[String(year)] = match ? Math.round(match.distanceMeters / 1000) : 0;
    }
    return row;
  });

  const colors = ['#f97316', '#2563eb', '#22c55e'];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" unit=" km" />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Legend />
        {years.map((year, i) => (
          <Line
            key={year}
            type="monotone"
            dataKey={String(year)}
            name={String(year)}
            stroke={colors[i % colors.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
