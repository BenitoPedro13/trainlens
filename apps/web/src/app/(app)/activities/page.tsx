import Link from 'next/link';
import { auth } from '@/auth';
import { listActivities } from '@/lib/api-client';
import { formatDate, formatDistance, formatDuration } from '@/lib/format';

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const data = await listActivities(userId, { page, limit: 20 }, email);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Atividades</h1>
        <p className="mt-1 text-sm text-gray-500">
          {data.total} atividade{data.total === 1 ? '' : 's'} sincronizada{data.total === 1 ? '' : 's'}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          Nenhuma atividade ainda. Conecte o Strava para sincronizar.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {data.items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/activities/${a.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(a.startedAt)} · {a.activityType}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDistance(a.distanceMeters)} · {formatDuration(a.durationSeconds)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/activities?page=${page - 1}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Anterior
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Página {page} de {data.totalPages}
          </span>
          {page < data.totalPages && (
            <Link
              href={`/activities?page=${page + 1}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
