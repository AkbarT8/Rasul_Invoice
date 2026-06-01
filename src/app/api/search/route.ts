import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, visibleClientIds } from '@/lib/rbac';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const u = await requireUser();
  if (u.response) return u.response;

  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ clients: [], proformas: [], cells: [] });

  const ids = await visibleClientIds(u.user);
  const clientFilter = ids === 'all' ? {} : { id: { in: ids } };
  const proformaClientFilter = ids === 'all' ? {} : { clientId: { in: ids } };

  const [clients, proformas, cells] = await Promise.all([
    prisma.client.findMany({
      where: {
        AND: [
          clientFilter,
          {
            OR: [
              { name: { contains: q } },
              { companyName: { contains: q } },
              { email: { contains: q } },
              { country: { contains: q } },
              { notes: { contains: q } }
            ]
          }
        ]
      },
      take: 10,
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.proforma.findMany({
      where: {
        AND: [
          proformaClientFilter,
          {
            OR: [
              { number: { contains: q } },
              { notes: { contains: q } }
            ]
          }
        ]
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { client: { select: { id: true, name: true } } }
    }),
    prisma.proformaCell.findMany({
      where: {
        value: { contains: q },
        row: { proforma: proformaClientFilter }
      },
      take: 10,
      include: {
        row: { include: { proforma: { include: { client: { select: { id: true, name: true } } } } } },
        column: true
      }
    })
  ]);

  return NextResponse.json({
    clients,
    proformas,
    cells: cells.map((c) => ({
      id: c.id,
      value: c.value,
      columnName: c.column.name,
      proforma: {
        id: c.row.proforma.id,
        number: c.row.proforma.number,
        client: c.row.proforma.client
      }
    }))
  });
}
