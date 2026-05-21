import Link from 'next/link';
import { signOut } from '@/auth';

const nav = [
  { href: '/dashboard' as const, label: 'Dashboard' },
  { href: '/activities' as const, label: 'Activities' },
  { href: '/analytics/training-load' as const, label: 'Training load' },
  { href: '/analytics/best-efforts' as const, label: 'Best efforts' },
  { href: '/analytics/zones' as const, label: 'Zonas' },
  { href: '/analytics/progress' as const, label: 'Progresso' },
  { href: '/segments' as const, label: 'Segmentos' },
  { href: '/settings' as const, label: 'Settings' },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
          <svg
            className="h-5 w-5 text-orange-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="font-bold text-gray-900">TrainLens</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <span className="font-bold text-gray-900 md:hidden">TrainLens</span>
          <p className="hidden text-sm text-gray-500 md:block">{email}</p>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
