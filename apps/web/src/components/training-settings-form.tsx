'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { TrainingSettings } from '@trainlens/shared';
import { updateTrainingSettings } from '@/lib/training-settings-actions';

export function TrainingSettingsForm({ initial }: { initial: TrainingSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Limiares de treino</h2>
      <p className="mt-2 text-sm text-gray-500">
        Usados para TSS, zonas e potência estimada quando não há dados do dispositivo.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            setMessage(null);
            try {
              await updateTrainingSettings({
                ftpWatts: numOrNull(fd.get('ftpWatts')),
                maxHeartRate: numOrNull(fd.get('maxHeartRate')),
                weightKg: floatOrNull(fd.get('weightKg')),
                thresholdPaceSecondsPerKm: floatOrNull(fd.get('thresholdPaceSecondsPerKm')),
              });
              setMessage('Guardado. Recalcule métricas com um novo sync se necessário.');
              router.refresh();
            } catch {
              setMessage('Erro ao guardar.');
            }
          });
        }}
      >
        <Field
          label="FTP (W)"
          name="ftpWatts"
          type="number"
          defaultValue={initial.ftpWatts ?? ''}
          placeholder="200"
        />
        <Field
          label="FC máx (bpm)"
          name="maxHeartRate"
          type="number"
          defaultValue={initial.maxHeartRate ?? ''}
          placeholder="190"
        />
        <Field
          label="Peso (kg)"
          name="weightKg"
          type="number"
          step="0.1"
          defaultValue={initial.weightKg ?? ''}
          placeholder="75"
        />
        <Field
          label="Ritmo limiar (s/km)"
          name="thresholdPaceSecondsPerKm"
          type="number"
          defaultValue={initial.thresholdPaceSecondsPerKm ?? ''}
          placeholder="300"
        />
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Guardar
          </button>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      </form>
    </section>
  );
}

function Field(props: React.ComponentProps<'input'> & { label: string }) {
  const { label, ...input } = props;
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
      {label}
      <input
        {...input}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
      />
    </label>
  );
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function floatOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
