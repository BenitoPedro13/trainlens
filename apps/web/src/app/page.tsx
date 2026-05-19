export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-950 to-brand-900 p-8">
      <div className="text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-brand-400 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-7 w-7 text-brand-950"
            >
              <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">TrainLens</h1>
        </div>

        <p className="mt-2 text-xl text-brand-200">
          Free, multi-source fitness analytics platform
        </p>
        <p className="mt-4 max-w-lg text-brand-300">
          Connect your Strava, Garmin, or Apple Health data and get meaningful insights —{' '}
          <span className="text-brand-400 font-medium">
            things your fitness app doesn&apos;t show you.
          </span>
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="rounded-full bg-brand-800/50 px-4 py-1.5 text-sm text-brand-300 ring-1 ring-brand-700">
            Sprint 0 — Project skeleton running ✓
          </div>
          <p className="text-xs text-brand-500">Authentication coming in Sprint 1</p>
        </div>
      </div>
    </main>
  );
}
