import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { columnSchema } from '@/lib/validators';

export const runtime = 'nodejs';

async function ensure(userId: string, role: 'ADMIN' | 'USER', proformaId: string) {
  const p = await prisma.proforma.findUnique({ where: { id: proformaId }, select: { clientId: true } });
  if (!p) return { error: 'Not found' as const, status: 404 };
  if (!(await userCanAccessClient({ sub: userId, email: '', name: '', role }, p.clientId))) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; colId: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensure(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => null);
  const parsed = columnSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  const col = await prisma.proformaColumn.update({
    where: { id: params.colId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.width !== undefined ? { width: parsed.data.width } : {}),
      ...(parsed.data.hidden !== undefined ? { hidden: parsed.data.hidden } : {}),
      ...(parsed.data.options !== undefined
        ? { options: parsed.data.options.length ? JSON.stringify(parsed.data.options) : null }
        : {})
    }
  });
  return NextResponse.json({ column: col });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; colId: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  if (u.user.role !== 'ADMIN') return jsonError('Только администратор может удалять колонки', 403);
  const access = await ensure(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  await prisma.proformaColumn.delete({ where: { id: params.colId } });
  return NextResponse.json({ ok: true });
}
