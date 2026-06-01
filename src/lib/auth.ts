import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'rasul_session';
const ALG = 'HS256';

function secretKey() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error('JWT_SECRET is not set or too short. Set it in .env (min 32 chars).');
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = {
  sub: string;     // user id
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
};

export async function signSession(payload: SessionPayload, ttlSeconds = 60 * 60 * 24 * 30) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    if (!payload.sub || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String((payload as any).name ?? ''),
      role: (payload as any).role === 'ADMIN' ? 'ADMIN' : 'USER'
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c?.value) return null;
  return verifySession(c.value);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function setSessionCookie(token: string, remember: boolean) {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
