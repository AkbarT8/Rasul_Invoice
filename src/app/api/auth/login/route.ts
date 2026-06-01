import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { setSessionCookie, signSession, verifyPassword } from '@/lib/auth';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много попыток. Подождите минуту.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }
  const { email, password, remember } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER'
  });
  setSessionCookie(token, !!remember);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}
