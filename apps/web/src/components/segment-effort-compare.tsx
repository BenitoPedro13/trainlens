'use client';

import { useState } from 'react';
import { compareSegmentEfforts } from '@/lib/api-client';
import type { SegmentEffortItem, EffortCompareResult } from '@/lib/api-client';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.abs(s) % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDiff(diff: number) {
  const abs = Math.abs(diff);
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  return `${sign}${fmt(abs)}`;
}

interface Props {
  segmentId: string;
  userId: string;
  email?: string | null | undefined;
  efforts: SegmentEffortItem[];
  prId: string | null;
}

export function SegmentEffortCompare({ segmentId, userId, email, efforts, prId }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<EffortCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
    setResult(null);
    setError(null);
  }

  async function compare() {
    const [e1, e2] = selected;
    if (!e1 || !e2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareSegmentEfforts(userId, segmentId, e1, e2, email);
      setResult(res);
    } catch {
      setError('Não foi possível comparar os esforços.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Todos os esforços</h2>
        {selected.length === 2 && (
          <button
            onClick={compare}
            disabled={loading}
            className="rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Comparando…' : 'Comparar selecionados'}
          </button>
        )}
        {selected.length > 0 && selected.length < 2 && (
          <span className="text-xs text-gray-400">Selecione mais 1 esforço</span>
        )}
      </div>

      {result && (
        <div className="border-b border-orange-100 bg-orange-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Comparação
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {new Date(result.effort1.startDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xl font-mono font-semibold text-gray-900">
                {fmt(result.effort1.elapsedSeconds)}
              </p>
              {result.effort1.averageHeartRate && (
                <p className="text-xs text-gray-500">{Math.round(result.effort1.averageHeartRate)} bpm</p>
              )}
            </div>
            <div className="flex items-center justify-center">
              <span
                className={`text-lg font-mono font-bold ${
                  result.diffSeconds > 0
                    ? 'text-red-500'
                    : result.diffSeconds < 0
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {fmtDiff(result.diffSeconds)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {new Date(result.effort2.startDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xl font-mono font-semibold text-gray-900">
                {fmt(result.effort2.elapsedSeconds)}
              </p>
              {result.effort2.averageHeartRate && (
                <p className="text-xs text-gray-500">{Math.round(result.effort2.averageHeartRate)} bpm</p>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Tempo</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">FC média</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Potência</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Rank PR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {efforts.map((effort) => {
            const isSelected = selected.includes(effort.id);
            const isPr = effort.id === prId;
            return (
              <tr
                key={effort.id}
                onClick={() => toggle(effort.id)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-orange-100'
                    : isPr
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-2.5">
                  <div
                    className={`h-4 w-4 rounded border-2 ${
                      isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {new Date(effort.startDate).toLocaleDateString('pt-BR')}
                  {isPr && (
                    <span className="ml-2 rounded bg-orange-100 px-1 text-xs text-orange-700">
                      PR
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                  {fmt(effort.elapsedSeconds)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {effort.averageHeartRate != null
                    ? `${Math.round(effort.averageHeartRate)} bpm`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {effort.averageWatts != null ? `${Math.round(effort.averageWatts)} W` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {effort.prRank != null ? `#${effort.prRank}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
