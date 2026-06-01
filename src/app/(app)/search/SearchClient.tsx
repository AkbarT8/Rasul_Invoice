'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, FileSpreadsheet, Users } from 'lucide-react';

type Results = {
  clients: any[];
  proformas: any[];
  cells: any[];
};

export default function SearchClient() {
  return (
    <Suspense fallback={<div className="p-6 muted">Загрузка...</div>}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const sp = useSearchParams();
  const initial = sp.get('q') || '';
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setData(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const j = await r.json();
      setData(j);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6 max-w-[920px] mx-auto">
      <h1 className="h1 mb-4">Глобальный поиск</h1>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
        <input
          autoFocus
          className="input pl-9 text-base py-3"
          placeholder="Имя клиента, номер счёта, артикул, заметка..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm muted">Поиск...</div>}

      {data && (
        <div className="space-y-6">
          <Section title="Клиенты" icon={Users} count={data.clients.length}>
            {data.clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="block card p-3 hover:bg-bg-subtle">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs muted mt-0.5">{c.companyName || ''} {c.country ? '· ' + c.country : ''} {c.email ? '· ' + c.email : ''}</div>
              </Link>
            ))}
          </Section>

          <Section title="Счета" icon={FileSpreadsheet} count={data.proformas.length}>
            {data.proformas.map((p) => (
              <Link key={p.id} href={`/clients/${p.client.id}/proformas/${p.id}`} className="block card p-3 hover:bg-bg-subtle">
                <div className="font-medium">{p.number}</div>
                <div className="text-xs muted mt-0.5">{p.client.name}</div>
              </Link>
            ))}
          </Section>

          <Section title="Ячейки" icon={Search} count={data.cells.length}>
            {data.cells.map((c) => (
              <Link key={c.id} href={`/clients/${c.proforma.client.id}/proformas/${c.proforma.id}`} className="block card p-3 hover:bg-bg-subtle">
                <div className="text-sm">«{c.value}»</div>
                <div className="text-xs muted mt-0.5">{c.proforma.client.name} · {c.proforma.number} · {c.columnName}</div>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: any; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold muted">
        <Icon className="w-4 h-4" /> {title} <span className="text-xs">({count})</span>
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
