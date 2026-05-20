'use client';

import type { TrainingLoad } from '@trainlens/shared';
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

export function TrainingLoadChart({ points }: { points: TrainingLoad[] }) {
  if (!points.length) {
    return <p className="text-sm text-gray-400">Sem dados de carga para o período.</p>;
  }

  const data = points.map((p) => ({
    date: p.date.slice(5),
    ctl: p.ctl,
    atl: p.atl,
    tsb: p.tsb,
    tss: p.tss,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend />
        <Line type="monotone" dataKey="ctl" name="CTL (fitness)" stroke="#2563eb" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="atl" name="ATL (fadiga)" stroke="#f97316" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="tsb" name="TSB (forma)" stroke="#22c55e" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
