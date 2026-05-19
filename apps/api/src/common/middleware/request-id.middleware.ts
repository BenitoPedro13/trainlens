import type { IncomingMessage, ServerResponse } from 'http';

export function requestIdMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
