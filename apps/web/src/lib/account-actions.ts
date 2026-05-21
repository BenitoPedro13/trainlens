'use server';

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { createApiAccessToken } from './api-token';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function apiToken() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
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

export async function requestExport(): Promise<{ exportJobId: string }> {
  const token = await apiToken();
  const res = await fetch(`${API_URL}/api/v1/users/me/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ exportJobId: string }>;
}

export async function getExportStatus(
  exportJobId: string,
): Promise<{ status: string; expiresAt: string | null; errorMessage: string | null }> {
  const token = await apiToken();
  const res = await fetch(`${API_URL}/api/v1/users/me/export/${exportJobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; expiresAt: string | null; errorMessage: string | null }>;
}

export async function downloadExport(exportJobId: string): Promise<string> {
  const token = await apiToken();
  const res = await fetch(`${API_URL}/api/v1/users/me/export/${exportJobId}/download`, {
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
