import type { Route } from 'next';

export interface ActivitiesQuery {
  page?: string;
  activityType?: string;
  from?: string;
  to?: string;
}

export function buildActivitiesHref(
  query: ActivitiesQuery,
  overrides?: Partial<ActivitiesQuery>,
): Route {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  const page = merged.page ?? '1';
  if (page !== '1') params.set('page', page);

  if (merged.activityType) params.set('activityType', merged.activityType);
  if (merged.from) params.set('from', merged.from);
  if (merged.to) params.set('to', merged.to);

  const qs = params.toString();
  return (qs ? `/activities?${qs}` : '/activities') as Route;
}

export function hasActivityFilters(query: ActivitiesQuery): boolean {
  return Boolean(query.activityType || query.from || query.to);
}
