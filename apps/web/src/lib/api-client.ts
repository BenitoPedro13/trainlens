import { signOut } from '@/auth';
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
    // Stale session or deleted account — sign out and bounce to login.
    if (res.status === 401) await signOut({ redirectTo: '/login' });
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

export function getSyncStatus(userId: string, email?: string | null) {
  return apiFetch<{
    provider: string;
    status: string;
    lastSyncedAt: string | null;
    syncErrorMessage: string | null;
    connected: boolean;
  }>('/users/me/sync-status', userId, email);
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

export function getTrainingLoad(
  userId: string,
  params: { from?: string; to?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').TrainingLoadResponse>(
    `/analytics/training-load${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}

export function getBestEfforts(userId: string, activityType?: string, email?: string | null) {
  const qs = activityType ? `?activityType=${activityType}` : '';
  return apiFetch<import('@trainlens/shared').BestEffortsResponse>(
    `/analytics/best-efforts${qs}`,
    userId,
    email,
  );
}

export function getBestEffortProgression(
  userId: string,
  params: { activityType?: string; from?: string; to?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.activityType) q.set('activityType', params.activityType);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').BestEffortProgressionResponse>(
    `/analytics/best-efforts/progression${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}

export function getTrainingSettings(userId: string, email?: string | null) {
  return apiFetch<import('@trainlens/shared').TrainingSettings>(
    '/users/me/training-settings',
    userId,
    email,
  );
}

export function getZones(
  userId: string,
  params: { from?: string; to?: string; activityType?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.activityType) q.set('activityType', params.activityType);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').ZonesResponse>(
    `/analytics/zones${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}

export function getYearOverYear(
  userId: string,
  params: { mode?: 'week' | 'month'; from?: string; to?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.mode) q.set('mode', params.mode);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').YearOverYearResponse>(
    `/analytics/year-over-year${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}

export interface SegmentListItem {
  id: string;
  externalId: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  averageGrade: number | null;
  climbCategory: number | null;
  city: string | null;
  country: string | null;
  prElapsedSeconds: number | null;
  prDate: string | null;
  effortCount: number;
}

export interface SegmentEffortItem {
  id: string;
  elapsedSeconds: number;
  movingSeconds: number | null;
  startDate: string;
  averageWatts: number | null;
  averageHeartRate: number | null;
  prRank: number | null;
}

export interface SegmentDetail {
  id: string;
  externalId: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  averageGrade: number | null;
  maximumGrade: number | null;
  elevationHigh: number | null;
  elevationLow: number | null;
  climbCategory: number | null;
  city: string | null;
  country: string | null;
  efforts: SegmentEffortItem[];
}

export function listSegments(userId: string, email?: string | null) {
  return apiFetch<SegmentListItem[]>('/segments', userId, email);
}

export function getSegment(userId: string, id: string, email?: string | null) {
  return apiFetch<SegmentDetail>(`/segments/${id}`, userId, email);
}

export function getPaceHistogram(
  userId: string,
  params: { from?: string; to?: string; activityType?: string },
  email?: string | null,
) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.activityType) q.set('activityType', params.activityType);
  const qs = q.toString();
  return apiFetch<import('@trainlens/shared').PaceHistogramResponse>(
    `/analytics/pace-histogram${qs ? `?${qs}` : ''}`,
    userId,
    email,
  );
}
