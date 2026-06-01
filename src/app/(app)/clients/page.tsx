import TopBar from '@/components/TopBar';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { visibleClientIds } from '@/lib/rbac';
import ClientsClient from './ClientsClient';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  const ids = await visibleClientIds(u);
  const where = ids === 'all' ? {} : { id: { in: ids } };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { _count: { select: { proformas: true } } }
    }),
    prisma.client.count({ where })
  ]);

  return (
    <>
      <TopBar title="Клиенты" />
      <ClientsClient
        initialItems={items.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          email: c.email,
          phone: c.phone,
          country: c.country,
          notes: c.notes,
          proformasCount: c._count.proformas,
          createdAt: c.createdAt.toISOString()
        }))}
        initialTotal={total}
        isAdmin={u.role === 'ADMIN'}
      />
    </>
  );
}
