'use server';

import { auth } from '@/auth';
import { createApiAccessToken } from './api-token';
import type { TrainingSettings } from '@trainlens/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function updateTrainingSettings(body: Partial<TrainingSettings>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const token = await createApiAccessToken(session.user.id, session.user.email);
  const res = await fetch(`${API_URL}/api/v1/users/me/training-settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}
