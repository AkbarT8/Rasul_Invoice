import TopBar from '@/components/TopBar';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { visibleClientIds } from '@/lib/rbac';
import { notFound, redirect } from 'next/navigation';
import ClientDetailClient from './ClientDetailClient';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const u = await getCurrentUser();
  if (!u) redirect('/login');

  const ids = await visibleClientIds(u);
  if (ids !== 'all' && !ids.includes(params.id)) notFound();

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      proformas: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { rows: true } } }
      },
      attachments: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!client) notFound();

  return (
    <>
      <TopBar title={`Клиент · ${client.name}`} />
      <ClientDetailClient
        client={{
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          country: client.country,
          notes: client.notes
        }}
        proformas={client.proformas.map((p) => ({
          id: p.id,
          number: p.number,
          status: p.status,
          currency: p.currency,
          date: p.date.toISOString(),
          notes: p.notes,
          rowsCount: p._count.rows,
          updatedAt: p.updatedAt.toISOString()
        }))}
        attachments={client.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          storedName: a.storedName,
          mimeType: a.mimeType,
          size: a.size,
          createdAt: a.createdAt.toISOString()
        }))}
        canEdit={u.role === 'ADMIN'}
      />
    </>
  );
}
