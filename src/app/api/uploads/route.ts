import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png'
]);

function safeName(name: string) {
  return name.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 120);
}

export async function POST(req: NextRequest) {
  const u = await requireUser();
  if (u.response) return u.response;

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError('Bad request', 400);

  const file = form.get('file');
  const clientId = (form.get('clientId') as string) || null;
  const proformaId = (form.get('proformaId') as string) || null;
  if (!(file instanceof File)) return jsonError('Файл не передан', 400);

  if (!clientId && !proformaId) return jsonError('Нужно указать clientId или proformaId', 400);

  let resolvedClientId = clientId;
  if (proformaId) {
    const p = await prisma.proforma.findUnique({ where: { id: proformaId }, select: { clientId: true } });
    if (!p) return jsonError('Proforma not found', 404);
    resolvedClientId = p.clientId;
  }
  if (!resolvedClientId) return jsonError('Bad request', 400);
  if (!(await userCanAccessClient(u.user, resolvedClientId))) return jsonError('Forbidden', 403);

  if (!ALLOWED.has(file.type)) return jsonError('Тип файла не поддерживается', 415);

  const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > maxBytes) return jsonError(`Файл слишком большой (макс. ${Math.round(maxBytes/1024/1024)} MB)`, 413);

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  const storedName = `${crypto.randomBytes(8).toString('hex')}_${safeName(file.name)}`;
  await writeFile(path.join(uploadsDir, storedName), buf);

  const att = await prisma.attachment.create({
    data: {
      name: file.name,
      storedName,
      mimeType: file.type,
      size: buf.length,
      uploadedById: u.user.sub,
      clientId: resolvedClientId,
      proformaId: proformaId || null
    }
  });
  return NextResponse.json({ attachment: { ...att, url: `/uploads/${storedName}` } });
}
