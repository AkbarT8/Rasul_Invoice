import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { proformaSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  if (!(await userCanAccessClient(u.user, params.id))) return jsonError('Forbidden', 403);

  const proformas = await prisma.proforma.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { rows: true, columns: true } } }
  });
  return NextResponse.json({ proformas });
}

const DEFAULT_COLUMNS: Array<{ name: string; type: string; width: number }> = [
  { name: 'Article',  type: 'text',   width: 220 },
  { name: 'Quantity', type: 'number', width: 110 },
  { name: 'Price',    type: 'number', width: 120 },
  { name: 'Weight',   type: 'number', width: 110 },
  { name: 'Delivery', type: 'text',   width: 160 }
];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;
  if (!(await userCanAccessClient(u.user, params.id))) return jsonError('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = proformaSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);

  const data = parsed.data;
  const existing = await prisma.proforma.findUnique({
    where: { clientId_number: { clientId: params.id, number: data.number } }
  });
  if (existing) return jsonError('Номер счёта уже существует у этого клиента', 409);

  const proforma = await prisma.proforma.create({
    data: {
      clientId: params.id,
      number: data.number,
      date: data.date ? new Date(data.date) : new Date(),
      status: data.status || 'DRAFT',
      currency: data.currency || 'USD',
      notes: data.notes || null,
      createdById: u.user.sub,
      columns: {
        create: DEFAULT_COLUMNS.map((c, i) => ({ ...c, order: i }))
      }
    },
    include: { columns: true }
  });

  return NextResponse.json({ proforma });
}
