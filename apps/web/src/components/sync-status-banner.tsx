import { getSyncStatus } from '@/lib/api-client';

const STATUS_LABELS: Record<string, string> = {
  active: 'Sincronizado',
  error: 'Erro de sincronização',
  revoked: 'Strava desconectado',
  paused: 'Sincronização pausada',
  disconnected: 'Strava não conectado',
};

export async function SyncStatusBanner({
  userId,
  email,
}: {
  userId: string;
  email?: string | null | undefined;
}) {
  const status = await getSyncStatus(userId, email);
  const label = STATUS_LABELS[status.status] ?? status.status;
  const isError = status.status === 'error' || Boolean(status.syncErrorMessage);

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      <p>
        <span className="font-medium">Strava:</span> {label}
        {status.lastSyncedAt && (
          <span className="text-gray-500">
            {' '}
            · último sync{' '}
            {new Date(status.lastSyncedAt).toLocaleString('pt-BR')}
          </span>
        )}
      </p>
      {status.syncErrorMessage && (
        <p className="mt-1 text-xs">{status.syncErrorMessage}</p>
      )}
      {!status.connected && (status.status === 'disconnected' || status.status === 'revoked') && (
        <p className="mt-1 text-xs">
          {status.status === 'revoked' ? 'Reconecte o Strava em' : 'Conecte o Strava em'}{' '}
          <a href="/settings" className="font-medium text-orange-600 hover:underline">
            Configurações
          </a>
          .
        </p>
      )}
    </div>
  );
}
