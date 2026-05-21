'use client';

import { useQuery } from '@tanstack/react-query';
import type { PaginatedActivitiesResponse } from '@trainlens/shared';

export interface ActivitiesParams {
  page?: number;
  activityType?: string;
  from?: string;
  to?: string;
}

async function fetchActivities(params: ActivitiesParams): Promise<PaginatedActivitiesResponse> {
  const q = new URLSearchParams();
  if (params.page && params.page > 1) q.set('page', String(params.page));
  if (params.activityType) q.set('activityType', params.activityType);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const qs = q.toString();

  const res = await fetch(`/api/proxy/activities${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch activities');
  return res.json() as Promise<PaginatedActivitiesResponse>;
}

export function useActivities(params: ActivitiesParams) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => fetchActivities(params),
    placeholderData: (prev) => prev,
  });
}
