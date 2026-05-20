import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/auth';
import { getUserSettings } from '@/lib/user-settings';
import { SettingsAccountActions } from '@/components/settings-account-actions';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { user, connection } = await getUserSettings(session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Conta e integrações.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Conta</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          {user?.name && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">{user.name}</dd>
            </div>
          )}
          {user?.createdAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Membro desde</dt>
              <dd className="text-gray-900">
                {user.createdAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Strava</h2>
        {connection ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium capitalize text-gray-900">{connection.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Atleta ID</dt>
              <dd className="font-mono text-gray-900">{connection.externalAthleteId}</dd>
            </div>
            {connection.lastSyncedAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Último sync</dt>
                <dd className="text-gray-900">
                  {connection.lastSyncedAt.toLocaleString('pt-BR')}
                </dd>
              </div>
            )}
            {connection.syncErrorMessage && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {connection.syncErrorMessage}
              </p>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Nenhuma conta Strava conectada.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <form
            action={async () => {
              'use server';
              await signIn('strava', { redirectTo: '/settings' });
            }}
          >
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              {connection ? 'Reconectar Strava' : 'Conectar Strava'}
            </button>
          </form>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </section>

      <SettingsAccountActions hasStrava={Boolean(connection)} />

      <section className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Sessão</h2>
        <p className="mt-2 text-sm text-gray-500">Encerrar sessão neste dispositivo.</p>
        <form
          className="mt-4"
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Sair
          </button>
        </form>
      </section>
    </div>
  );
}
