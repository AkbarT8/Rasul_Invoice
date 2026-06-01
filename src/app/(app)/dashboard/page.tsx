import TopBar from '@/components/TopBar';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { visibleClientIds } from '@/lib/rbac';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_TONES, formatDateTime } from '@/lib/utils';
import { ArrowUpRight, FileSpreadsheet, Package, Users, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function loadStats() {
  const u = await getCurrentUser();
  if (!u) return null;
  const ids = await visibleClientIds(u);
  const clientFilter = ids === 'all' ? {} : { id: { in: ids } };
  const proformaFilter = ids === 'all' ? {} : { clientId: { in: ids } };

  const [clients, proformas, items, pending, completed, recent] = await Promise.all([
    prisma.client.count({ where: clientFilter }),
    prisma.proforma.count({ where: proformaFilter }),
    prisma.proformaRow.count({ where: { proforma: proformaFilter } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'PENDING' } }),
    prisma.proforma.count({ where: { ...proformaFilter, status: 'COMPLETED' } }),
    prisma.proforma.findMany({
      where: proformaFilter,
      orderBy: { updatedAt: 'desc' },
      take: 7,
      include: { client: { select: { id: true, name: true } }, _count: { select: { rows: true } } }
    })
  ]);
  return { clients, proformas, items, pending, completed, recent, user: u };
}

function StatCard({ label, value, icon: Icon, tone = 'brand' }: { label: string; value: number; icon: any; tone?: 'brand' | 'amber' | 'emerald' | 'gray' }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  };
  return (
    <div className="card p-5 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide muted font-semibold">{label}</div>
          <div className="text-3xl font-bold tracking-tight mt-1">{value.toLocaleString('ru-RU')}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await loadStats();
  if (!s) return null;

  return (
    <>
      <TopBar title="Дашборд" />
      <div className="p-6 max-w-[1280px] mx-auto">
        <div className="mb-1 text-sm muted">С возвращением, {s.user.name}</div>
        <h1 className="h1 mb-6">Обзор</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Клиенты"   value={s.clients}   icon={Users}           tone="brand" />
          <StatCard label="Счета"     value={s.proformas} icon={FileSpreadsheet} tone="gray" />
          <StatCard label="Позиции"   value={s.items}     icon={Package}         tone="gray" />
          <StatCard label="Pending"   value={s.pending}   icon={Clock}           tone="amber" />
          <StatCard label="Completed" value={s.completed} icon={CheckCircle2}    tone="emerald" />
        </div>

        <div className="mt-8 card">
          <div className="flex items-center justify-between px-5 h-12 border-b border-border">
            <div className="font-semibold text-[15px]">Недавние счета</div>
            <Link href="/clients" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
              К клиентам <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          {s.recent.length === 0 ? (
            <div className="p-10 text-center muted text-sm">Пока нет счетов. Создайте первого клиента и счёт.</div>
          ) : (
            <ul className="divide-y divide-border">
              {s.recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-subtle/60 transition-colors">
                  <div className="min-w-0">
                    <Link
                      href={`/clients/${p.client.id}/proformas/${p.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {p.client.name} · {p.number}
                    </Link>
                    <div className="text-xs muted mt-0.5">
                      {p._count.rows} позиций · обновлено {formatDateTime(p.updatedAt)}
                    </div>
                  </div>
                  <span className={`chip ${STATUS_TONES[p.status]}`}>{STATUS_LABELS[p.status] || p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
