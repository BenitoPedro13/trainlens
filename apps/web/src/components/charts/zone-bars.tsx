'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ZoneBars({
  data,
  valueKey,
  unit,
}: {
  data: Array<{ label: string; durationSeconds: number; percentOfTotal: number }>;
  valueKey: 'durationSeconds' | 'percentOfTotal';
  unit: string;
}) {
  if (!data.length || data.every((d) => d.durationSeconds === 0)) {
    return <p className="text-sm text-gray-400">Sem dados para este período.</p>;
  }

  const chartData = data.map((d) => ({
    name: d.label.replace(/^Z\d+\s*/, 'Z'),
    minutes: Math.round(d.durationSeconds / 60),
    pct: d.percentOfTotal,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" unit={unit} />
        <Tooltip
          formatter={(value: number) =>
            valueKey === 'percentOfTotal' ? `${value}%` : `${value} min`
          }
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Bar
          dataKey={valueKey === 'percentOfTotal' ? 'pct' : 'minutes'}
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
