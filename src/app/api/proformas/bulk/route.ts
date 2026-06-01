import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, visibleClientIds } from '@/lib/rbac';
import { z } from 'zod';
import { STATUSES } from '@/lib/validators';

export const runtime = 'nodejs';

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(5000),
  action: z.enum(['delete', 'status']),
  status: z.enum(STATUSES).optional()
});

export async function POST(req: NextRequest) {
  const u = await requireUser();
  if (u.response) return u.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  const ids = await visibleClientIds(u.user);
  const proformas = await prisma.proforma.findMany({
    where: {
      id: { in: parsed.data.ids },
      ...(ids === 'all' ? {} : { clientId: { in: ids } })
    },
    select: { id: true }
  });
  const allowedIds = proformas.map((p) => p.id);
  if (allowedIds.length === 0) return jsonError('Нет доступа к выбранным счетам', 403);

  if (parsed.data.action === 'delete') {
    if (u.user.role !== 'ADMIN') return jsonError('Только администратор может удалять счета', 403);
    await prisma.proforma.deleteMany({ where: { id: { in: allowedIds } } });
    return NextResponse.json({ ok: true, affected: allowedIds.length });
  }

  if (parsed.data.action === 'status' && parsed.data.status) {
    await prisma.proforma.updateMany({
      where: { id: { in: allowedIds } },
      data: { status: parsed.data.status }
    });
    return NextResponse.json({ ok: true, affected: allowedIds.length });
  }

  return jsonError('Bad request', 400);
}
