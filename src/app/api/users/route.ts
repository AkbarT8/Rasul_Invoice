import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireAdmin } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';
import { userCreateSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET() {
  const u = await requireAdmin();
  if (u.response) return u.response;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      assignments: { select: { clientId: true } }
    }
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const u = await requireAdmin();
  if (u.response) return u.response;
  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);
  const d = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email: d.email.toLowerCase().trim() } });
  if (exists) return jsonError('Пользователь с таким email уже существует', 409);

  const user = await prisma.user.create({
    data: {
      email: d.email.toLowerCase().trim(),
      name: d.name,
      role: d.role,
      passwordHash: await hashPassword(d.password),
      assignments: {
        create: d.clientIds?.map((cid) => ({ clientId: cid })) || []
      }
    }
  });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
