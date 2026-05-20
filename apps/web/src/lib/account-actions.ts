'use server';

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { createApiAccessToken } from './api-token';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function apiToken() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const token = await createApiAccessToken(session.user.id, session.user.email);
  return token;
}

export async function disconnectStrava(deleteActivities: boolean) {
  const token = await apiToken();
  const res = await fetch(`${API_URL}/api/v1/users/me/connections/strava/disconnect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deleteActivities }),
  });
  if (!res.ok) throw new Error(await res.text());
}

/** Returns pretty-printed JSON for client-side download. */
export async function exportAccountData(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const token = await createApiAccessToken(session.user.id, session.user.email);
  const res = await fetch(`${API_URL}/api/v1/users/me/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return JSON.stringify(data, null, 2);
}

export async function deleteAccount() {
  const token = await apiToken();
  const res = await fetch(`${API_URL}/api/v1/users/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  await signOut({ redirectTo: '/login' });
  redirect('/login');
}
