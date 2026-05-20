'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900">Algo correu mal</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ocorreu um erro inesperado. Pode tentar de novo ou voltar ao dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
