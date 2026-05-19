import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { signIn } from '@/auth';
import { LoginForm } from '@/components/login-form';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <svg
              className="h-7 w-7 text-orange-500"
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
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your account, or create one automatically on first login.
          </p>
        </div>

        {/* Email / password form */}
        <LoginForm />

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">or</span>
          </div>
        </div>

        {/* Strava OAuth */}
        <form
          action={async () => {
            'use server';
            await signIn('strava', { redirectTo: '/dashboard' });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            {/* Strava flame logo */}
            <svg
              className="h-5 w-5 text-[#FC4C02]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect with Strava
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Development mode — email/password creates an account on first login.
      </p>
    </div>
  );
}
