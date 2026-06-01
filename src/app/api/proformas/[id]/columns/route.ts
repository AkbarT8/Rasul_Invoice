import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { columnReorderSchema, columnSchema } from '@/lib/validators';

export const runtime = 'nodejs';

async function ensureAccess(userId: string, role: 'ADMIN' | 'USER', proformaId: string) {
  const p = await prisma.proforma.findUnique({ where: { id: proformaId }, select: { clientId: true } });
  if (!p) return { error: 'Not found' as const, status: 404 };
  if (!(await userCanAccessClient({ sub: userId, email: '', name: '', role }, p.clientId))) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { ok: true as const };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensureAccess(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const columns = await prisma.proformaColumn.findMany({
    where: { proformaId: params.id },
    orderBy: { order: 'asc' }
  });
  return NextResponse.json({ columns });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensureAccess(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => null);
  const parsed = columnSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);

  const last = await prisma.proformaColumn.findFirst({
    where: { proformaId: params.id },
    orderBy: { order: 'desc' },
    select: { order: true }
  });
  const order = (last?.order ?? -1) + 1;

  const col = await prisma.proformaColumn.create({
    data: {
      proformaId: params.id,
      name: parsed.data.name,
      type: parsed.data.type,
      width: parsed.data.width,
      hidden: parsed.data.hidden,
      options: parsed.data.options?.length ? JSON.stringify(parsed.data.options) : null,
      order
    }
  });
  return NextResponse.json({ column: col });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensureAccess(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => null);
  const parsed = columnReorderSchema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  await prisma.$transaction(
    parsed.data.order.map((colId, idx) =>
      prisma.proformaColumn.update({
        where: { id: colId },
        data: { order: idx }
      })
    )
  );
  return NextResponse.json({ ok: true });
}
