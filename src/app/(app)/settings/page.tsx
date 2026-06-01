import TopBar from '@/components/TopBar';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (u.role !== 'ADMIN') redirect('/dashboard');

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        assignments: { select: { clientId: true } }
      }
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
  ]);

  return (
    <>
      <TopBar title="Настройки" />
      <SettingsClient
        currentUserId={u.sub}
        users={users.map((x) => ({
          id: x.id,
          email: x.email,
          name: x.name,
          role: x.role,
          createdAt: x.createdAt.toISOString(),
          clientIds: x.assignments.map((a) => a.clientId)
        }))}
        clients={clients}
      />
    </>
  );
}
