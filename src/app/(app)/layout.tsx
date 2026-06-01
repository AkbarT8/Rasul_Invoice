import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar me={{ id: user.sub, email: user.email, name: user.name, role: user.role }} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
