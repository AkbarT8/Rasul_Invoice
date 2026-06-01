import TopBar from '@/components/TopBar';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { visibleClientIds } from '@/lib/rbac';
import { notFound, redirect } from 'next/navigation';
import ProformaEditor from './ProformaEditor';

export const dynamic = 'force-dynamic';

export default async function ProformaPage({ params }: { params: { id: string; proformaId: string } }) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const ids = await visibleClientIds(u);
  if (ids !== 'all' && !ids.includes(params.id)) notFound();

  const p = await prisma.proforma.findUnique({
    where: { id: params.proformaId },
    include: {
      client: true,
      columns: { orderBy: { order: 'asc' } },
      rows: { orderBy: { order: 'asc' }, include: { cells: true } },
      attachments: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!p || p.clientId !== params.id) notFound();

  const cellMap: Record<string, Record<string, { value: string | null; color: string | null }>> = {};
  for (const r of p.rows) {
    cellMap[r.id] = {};
    for (const c of r.cells) {
      cellMap[r.id]![c.columnId] = { value: c.value, color: c.color };
    }
  }

  return (
    <>
      <TopBar title={`${p.client.name} · ${p.number}`} />
      <ProformaEditor
        initial={{
          id: p.id,
          number: p.number,
          status: p.status,
          currency: p.currency,
          date: p.date.toISOString(),
          notes: p.notes,
          clientId: p.clientId,
          clientName: p.client.name,
          columns: p.columns.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            width: c.width,
            order: c.order,
            hidden: c.hidden,
            options: c.options
          })),
          rows: p.rows.map((r) => ({ id: r.id, order: r.order, color: r.color })),
          cells: cellMap,
          attachments: p.attachments.map((a) => ({
            id: a.id,
            name: a.name,
            storedName: a.storedName,
            size: a.size
          }))
        }}
        isAdmin={u.role === 'ADMIN'}
      />
    </>
  );
}
