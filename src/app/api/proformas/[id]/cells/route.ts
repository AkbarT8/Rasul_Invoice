import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { bulkCellUpdateSchema } from '@/lib/validators';

export const runtime = 'nodejs';

async function ensure(userId: string, role: 'ADMIN' | 'USER', proformaId: string) {
  const p = await prisma.proforma.findUnique({ where: { id: proformaId }, select: { clientId: true } });
  if (!p) return { error: 'Not found' as const, status: 404 };
  if (!(await userCanAccessClient({ sub: userId, email: '', name: '', role }, p.clientId))) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { ok: true as const };
}

// Bulk upsert cells. Each update has rowId+columnId; value and/or color.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const access = await ensure(u.user.sub, u.user.role, params.id);
  if (!access.ok) return jsonError(access.error, access.status);

  const body = await req.json().catch(() => null);
  const parsed = bulkCellUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  await prisma.$transaction(
    parsed.data.updates.map((u) =>
      prisma.proformaCell.upsert({
        where: { rowId_columnId: { rowId: u.rowId, columnId: u.columnId } },
        create: { rowId: u.rowId, columnId: u.columnId, value: u.value ?? null, color: u.color ?? null },
        update: {
          ...(u.value !== undefined ? { value: u.value } : {}),
          ...(u.color !== undefined ? { color: u.color } : {})
        }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
