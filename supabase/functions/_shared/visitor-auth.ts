// supabase/functions/_shared/visitor-auth.ts
import { SignJWT, jwtVerify } from 'https://esm.sh/jose';

function getSecret(): Uint8Array {
  const secret = Deno.env.get('VISITOR_JWT_SECRET');
  if (!secret) {
    throw new Error('VISITOR_JWT_SECRET environment variable is missing');
  }
  return new TextEncoder().encode(secret);
}

export async function signVisitorJWT(visitor_id: string, email: string): Promise<string> {
  return new SignJWT({ visitor_id, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyVisitorJWT(req: Request): Promise<{ visitor_id: string; email: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7).trim();
    const { payload } = await jwtVerify(token, getSecret());
    return { visitor_id: payload.visitor_id as string, email: payload.email as string };
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}
