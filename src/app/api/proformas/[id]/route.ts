import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { proformaSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const p = await prisma.proforma.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      columns: { orderBy: { order: 'asc' } },
      rows: { orderBy: { order: 'asc' }, include: { cells: true } },
      attachments: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!p) return jsonError('Not found', 404);
  if (!(await userCanAccessClient(u.user, p.clientId))) return jsonError('Forbidden', 403);
  return NextResponse.json({ proforma: p });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const p = await prisma.proforma.findUnique({ where: { id: params.id }, select: { clientId: true } });
  if (!p) return jsonError('Not found', 404);
  if (!(await userCanAccessClient(u.user, p.clientId))) return jsonError('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = proformaSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);

  const d = parsed.data;
  const updated = await prisma.proforma.update({
    where: { id: params.id },
    data: {
      ...(d.number !== undefined ? { number: d.number } : {}),
      ...(d.date !== undefined ? { date: d.date ? new Date(d.date) : new Date() } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.currency !== undefined ? { currency: d.currency } : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {})
    }
  });
  return NextResponse.json({ proforma: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  if (u.user.role !== 'ADMIN') return jsonError('Forbidden', 403);
  await prisma.proforma.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
