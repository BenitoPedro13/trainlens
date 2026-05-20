import * as Sentry from '@sentry/nestjs';

export function captureWorkerError(
  error: unknown,
  context: { queue: string; jobId?: string | undefined; jobName?: string | undefined; data?: unknown },
): void {
  if (!process.env['SENTRY_DSN']) return;

  Sentry.withScope((scope) => {
    scope.setTag('queue', context.queue);
    if (context.jobId != null) scope.setTag('jobId', context.jobId);
    if (context.jobName != null) scope.setTag('jobName', context.jobName);
    if (context.data && typeof context.data === 'object') {
      const data = context.data as Record<string, unknown>;
      if (typeof data['userId'] === 'string') scope.setUser({ id: data['userId'] });
      if (typeof data['provider'] === 'string') scope.setTag('provider', data['provider']);
    }
    if (context.data) scope.setExtra('jobData', context.data);
    Sentry.captureException(error);
  });
}
