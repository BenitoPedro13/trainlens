import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { signOut } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900">
            <svg
              className="h-5 w-5 text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            TrainLens
          </span>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session.user.email ?? 'athlete'} 👋
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Your Strava activities will appear here once the sync engine is wired up.
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
          No activities yet — connect Strava to start syncing.
        </div>
      </main>
    </div>
  );
}
