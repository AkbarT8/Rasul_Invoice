import { NextResponse } from 'next/server';
import { getCurrentUser, type SessionPayload } from './auth';
import { prisma } from './prisma';

export async function requireUser(): Promise<
  { user: SessionPayload; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SessionPayload; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const u = await requireUser();
  if (u.response) return u;
  if (u.user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user: u.user };
}

/**
 * Returns true if `user` can read/write `clientId`.
 * ADMIN: always true. USER: only if assigned to that client.
 */
export async function userCanAccessClient(user: SessionPayload, clientId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const a = await prisma.clientAssignment.findUnique({
    where: { userId_clientId: { userId: user.sub, clientId } }
  });
  return !!a;
}

export async function visibleClientIds(user: SessionPayload): Promise<string[] | 'all'> {
  if (user.role === 'ADMIN') return 'all';
  const rows = await prisma.clientAssignment.findMany({
    where: { userId: user.sub },
    select: { clientId: true }
  });
  return rows.map((r) => r.clientId);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
