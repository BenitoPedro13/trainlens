import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createApiAccessToken } from '@/lib/api-token';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await createApiAccessToken(session.user.id, session.user.email);
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API_URL}/api/v1/activities${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
