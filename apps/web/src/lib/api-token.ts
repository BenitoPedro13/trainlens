import { SignJWT } from 'jose';

export async function createApiAccessToken(
  userId: string,
  email?: string | null,
): Promise<string> {
  const secret = process.env['AUTH_SECRET'];
  if (!secret) throw new Error('AUTH_SECRET is not configured');

  const payload: Record<string, string> = { sub: userId };
  if (email) payload['email'] = email;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}
