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
import type { PaceHistogramBin } from '@trainlens/shared';

export function PaceHistogramChart({ bins }: { bins: PaceHistogramBin[] }) {
  if (!bins.length) {
    return <p className="text-sm text-gray-400">Sem dados de ritmo para este período.</p>;
  }

  const chartData = bins.map((b) => ({
    name: b.label,
    atividades: b.count,
    minutos: Math.round(b.totalDurationSeconds / 60),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={0} />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'atividades' ? [`${value} atividades`, 'Atividades'] : [`${value} min`, 'Tempo']
          }
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Bar dataKey="atividades" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
