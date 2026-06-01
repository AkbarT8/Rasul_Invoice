import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  const att = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!att) return jsonError('Not found', 404);
  const clientId = att.clientId;
  if (clientId && !(await userCanAccessClient(u.user, clientId))) return jsonError('Forbidden', 403);
  if (u.user.role !== 'ADMIN' && att.uploadedById !== u.user.sub) {
    return jsonError('Forbidden', 403);
  }
  await prisma.attachment.delete({ where: { id: params.id } });
  try { await unlink(path.join(process.cwd(), 'public', 'uploads', att.storedName)); } catch {}
  return NextResponse.json({ ok: true });
}
