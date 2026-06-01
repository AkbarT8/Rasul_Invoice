import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireAdmin, requireUser, userCanAccessClient } from '@/lib/rbac';
import { clientSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const id = params.id;

  if (!(await userCanAccessClient(u.user, id))) return jsonError('Forbidden', 403);

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      proformas: { orderBy: { createdAt: 'desc' } },
      attachments: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!client) return jsonError('Not found', 404);
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireAdmin();
  if (u.response) return u.response;
  const id = params.id;
  const body = await req.json().catch(() => null);
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);

  const d = parsed.data;
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.companyName !== undefined ? { companyName: d.companyName || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.country !== undefined ? { country: d.country || null } : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {})
    }
  });
  return NextResponse.json({ client });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireAdmin();
  if (u.response) return u.response;
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
