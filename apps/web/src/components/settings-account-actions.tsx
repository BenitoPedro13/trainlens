'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  disconnectStrava,
  requestExport,
  getExportStatus,
  downloadExport,
  deleteAccount,
} from '@/lib/account-actions';

type ExportState = 'idle' | 'requesting' | 'processing' | 'downloading' | 'done' | 'error';

const EXPORT_LABELS: Record<ExportState, string> = {
  idle: 'Exportar JSON',
  requesting: 'A solicitar…',
  processing: 'A preparar exportação…',
  downloading: 'A descarregar…',
  done: 'Exportação concluída',
  error: 'Erro — tentar novamente',
};

export function SettingsAccountActions({ hasStrava }: { hasStrava: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  async function handleExport() {
    setMessage(null);
    setExportState('requesting');
    try {
      const { exportJobId } = await requestExport();
      setExportState('processing');

      // Poll until ready or failed
      let status = 'processing';
      while (status === 'pending' || status === 'processing') {
        await new Promise((r) => setTimeout(r, 2000));
        const result = await getExportStatus(exportJobId);
        status = result.status;
        if (status === 'failed') {
          setExportState('error');
          setMessage(result.errorMessage ?? 'Falha ao exportar. Tente novamente.');
          return;
        }
      }

      setExportState('downloading');
      const json = await downloadExport(exportJobId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trainlens-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState('done');
      setMessage('Exportação concluída.');
    } catch {
      setExportState('error');
      setMessage('Falha ao exportar. Tente novamente.');
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">{message}</p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Exportar dados</h2>
        <p className="mt-2 text-sm text-gray-500">
          Descarrega um ficheiro JSON com atividades, métricas e ligações (sem tokens).
        </p>
        <button
          type="button"
          disabled={pending || (exportState !== 'idle' && exportState !== 'done' && exportState !== 'error')}
          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onClick={() => {
            setExportState('idle');
            startTransition(() => { void handleExport(); });
          }}
        >
          {EXPORT_LABELS[exportState]}
        </button>
      </section>

      {hasStrava && (
        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Desconectar Strava</h2>
          <p className="mt-2 text-sm text-gray-500">
            Revoga o acesso no Strava e remove a ligação. Pode manter ou apagar as atividades
            importadas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              onClick={() => {
                if (!confirm('Desconectar Strava e manter as atividades no TrainLens?')) return;
                startTransition(async () => {
                  setMessage(null);
                  await disconnectStrava(false);
                  setMessage('Strava desconectado. Atividades mantidas.');
                  router.refresh();
                });
              }}
            >
              Desconectar (manter dados)
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              onClick={() => {
                if (
                  !confirm(
                    'Isto apaga todas as atividades importadas e métricas. Continuar?',
                  )
                )
                  return;
                startTransition(async () => {
                  setMessage(null);
                  await disconnectStrava(true);
                  setMessage('Strava desconectado e dados removidos.');
                  router.refresh();
                });
              }}
            >
              Desconectar e apagar dados
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-red-300 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-red-900">Eliminar conta</h2>
        <p className="mt-2 text-sm text-gray-500">
          A conta fica inactiva durante 30 dias; depois todos os dados são apagados
          permanentemente.
        </p>
        <button
          type="button"
          disabled={pending}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          onClick={() => {
            if (
              !confirm(
                'Tem a certeza? A conta será desactivada e os dados apagados após 30 dias.',
              )
            )
              return;
            startTransition(async () => {
              await deleteAccount();
            });
          }}
        >
          Eliminar conta
        </button>
      </section>
    </div>
  );
}
