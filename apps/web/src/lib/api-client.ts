import { createApiAccessToken } from './api-token';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  userId: string,
  email?: string | null,
  init?: RequestInit,
): Promise<T> {
  const token = await createApiAccessToken(userId, email);
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

export function getAnalyticsSummary(userId: string, email?: string | null) {
  return apiFetch<import('@trainlens/shared').AnalyticsSummaryResponse>(
    '/analytics/summary',
    userId,
    email,
  );
}

export function getHeatmap(userId: string, year: number, email?: string | null) {
  return apiFetch<Array<{ date: string; count: number; distanceMeters: number }>>(
    `/analytics/heatmap?year=${year}`,
    userId,
    email,
  );
}

export function listActivities(
  userId: string,
  params: { page?: number; limit?: number; activityType?: string; from?: string; to?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.activityType) q.set('activityType', params.activityType);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').PaginatedActivitiesResponse>(
    `/activities${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}

export function getActivity(userId: string, id: string, email?: string | null) {
  return apiFetch<import('@trainlens/shared').ActivityDetailResponse>(
    `/activities/${id}`,
    userId,
    email,
  );
}
