'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Effort {
  elapsedSeconds: number;
  startDate: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SegmentEffortChart({ efforts }: { efforts: Effort[] }) {
  const sorted = [...efforts].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const data = sorted.map((e) => ({
    date: new Date(e.startDate).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    elapsed: e.elapsedSeconds,
    label: formatDuration(e.elapsedSeconds),
  }));

  const minVal = Math.min(...data.map((d) => d.elapsed));
  const maxVal = Math.max(...data.map((d) => d.elapsed));
  const padding = Math.max(10, Math.round((maxVal - minVal) * 0.1));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          domain={[minVal - padding, maxVal + padding]}
          tickFormatter={formatDuration}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: number) => [formatDuration(value), 'Tempo']}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="elapsed"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3, fill: '#f97316' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
