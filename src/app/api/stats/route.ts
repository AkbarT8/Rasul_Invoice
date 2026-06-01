import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac';
import { visibleClientIds } from '@/lib/rbac';

export const runtime = 'nodejs';

export async function GET() {
  const u = await requireUser();
  if (u.response) return u.response;

  const ids = await visibleClientIds(u.user);
  const clientFilter = ids === 'all' ? {} : { id: { in: ids } };
  const proformaFilter = ids === 'all' ? {} : { clientId: { in: ids } };

  const [clients, proformas, items, pending, completed, processing, draft, cancelled] = await Promise.all([
    prisma.client.count({ where: clientFilter }),
    prisma.proforma.count({ where: proformaFilter }),
    prisma.proformaRow.count({ where: { proforma: proformaFilter } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'PENDING' } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'COMPLETED' } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'PROCESSING' } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'DRAFT' } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'CANCELLED' } })
  ]);

  return NextResponse.json({
    clients,
    proformas,
    items,
    pending,
    completed,
    processing,
    draft,
    cancelled
  });
}
