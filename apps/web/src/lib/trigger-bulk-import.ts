/**
 * Enqueues a Strava bulk-import job on the NestJS API (server-to-server).
 * Called from the Auth.js signIn callback after tokens are stored.
 */
export async function triggerStravaBulkImport(userId: string): Promise<void> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  const secret = process.env['INTERNAL_SYNC_SECRET'];

  if (!secret) {
    console.warn('[sync] INTERNAL_SYNC_SECRET not set — skipping bulk import enqueue');
    return;
  }

  const res = await fetch(`${apiUrl}/api/v1/internal/sync/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
    },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bulk import enqueue failed (${res.status}): ${body}`);
  }
}
