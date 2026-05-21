import { Suspense } from 'react';
import { ActivitiesListClient } from '@/components/activities-list-client';

export default function ActivitiesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Atividades</h1>
        <p className="mt-1 text-sm text-gray-500">Histórico de atividades sincronizadas.</p>
      </div>
      <Suspense>
        <ActivitiesListClient />
      </Suspense>
    </div>
  );
}
