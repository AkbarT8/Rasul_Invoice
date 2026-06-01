import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireAdmin } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'nodejs';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  password: z.string().min(8).max(200).optional(),
  clientIds: z.array(z.string()).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireAdmin();
  if (u.response) return u.response;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError('Bad request', 400);

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.password !== undefined ? { passwordHash: await hashPassword(parsed.data.password) } : {})
    }
  });

  if (parsed.data.clientIds !== undefined) {
    await prisma.clientAssignment.deleteMany({ where: { userId: params.id } });
    if (parsed.data.clientIds.length > 0) {
      await prisma.clientAssignment.createMany({
        data: parsed.data.clientIds.map((cid) => ({ userId: params.id, clientId: cid }))
      });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireAdmin();
  if (u.response) return u.response;
  if (u.user.sub === params.id) return jsonError('Нельзя удалить самого себя', 400);
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
