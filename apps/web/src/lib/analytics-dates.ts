export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export function defaultAnalyticsRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function resolveDateRange(query: DateRangeQuery): { from: string; to: string } {
  const defaults = defaultAnalyticsRange();
  return {
    from: query.from ?? defaults.from,
    to: query.to ?? defaults.to,
  };
}
