import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { z } from 'zod';

export const runtime = 'nodejs';

async function ensure(userId: string, role: 'ADMIN' | 'USER', proformaId: string) {
  const p = await prisma.proforma.findUnique({ where: { id: proformaId }, select: { clientId: true } });
  if (!p) return { error: 'Not found' as const, status: 404 };
  if (!(await userCanAccessClient({ sub: userId, email: '', name: '', role }, p.clientId))) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { ok: true as const };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensure(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => ({}));
  const schema = z.object({
    count: z.number().int().min(1).max(100).optional().default(1),
    duplicateRowId: z.string().optional()
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  const last = await prisma.proformaRow.findFirst({
    where: { proformaId: params.id },
    orderBy: { order: 'desc' },
    select: { order: true }
  });
  let nextOrder = (last?.order ?? -1) + 1;

  const newRows: any[] = [];

  if (parsed.data.duplicateRowId) {
    const src = await prisma.proformaRow.findUnique({
      where: { id: parsed.data.duplicateRowId },
      include: { cells: true }
    });
    if (!src) return jsonError('Source row not found', 404);
    const row = await prisma.proformaRow.create({
      data: {
        proformaId: params.id,
        order: nextOrder++,
        color: src.color,
        cells: {
          create: src.cells.map((c) => ({
            columnId: c.columnId,
            value: c.value,
            color: c.color
          }))
        }
      },
      include: { cells: true }
    });
    newRows.push(row);
  } else {
    for (let i = 0; i < parsed.data.count; i++) {
      const row = await prisma.proformaRow.create({
        data: { proformaId: params.id, order: nextOrder++ },
        include: { cells: true }
      });
      newRows.push(row);
    }
  }

  return NextResponse.json({ rows: newRows });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensure(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => ({}));
  const schema = z.object({ ids: z.array(z.string()).min(1).max(5000) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);
  await prisma.proformaRow.deleteMany({
    where: { id: { in: parsed.data.ids }, proformaId: params.id }
  });
  return NextResponse.json({ ok: true });
}
