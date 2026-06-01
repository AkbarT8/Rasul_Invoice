import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireAdmin, requireUser, visibleClientIds } from '@/lib/rbac';
import { clientSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const u = await requireUser();
  if (u.response) return u.response;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const country = url.searchParams.get('country') || undefined;
  const sort = url.searchParams.get('sort') || 'createdAt';
  const dir = (url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50));

  const ids = await visibleClientIds(u.user);
  const where: any = {};
  if (ids !== 'all') where.id = { in: ids };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { companyName: { contains: q } },
      { email: { contains: q } },
      { country: { contains: q } },
      { phone: { contains: q } }
    ];
  }
  if (country) where.country = country;

  const orderBy: any = { [sort]: dir };

  const [total, items] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { proformas: true } } }
    })
  ]);

  return NextResponse.json({ total, page, pageSize, items });
}

export async function POST(req: NextRequest) {
  const u = await requireAdmin();
  if (u.response) return u.response;

  const body = await req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Bad request', 400);

  const data = parsed.data;
  const client = await prisma.client.create({
    data: {
      name: data.name,
      companyName: data.companyName || null,
      email: data.email || null,
      phone: data.phone || null,
      country: data.country || null,
      notes: data.notes || null,
      createdById: u.user.sub
    }
  });
  return NextResponse.json({ client });
}
