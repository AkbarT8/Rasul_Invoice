'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Modal } from '@/components/Modal';
import { Plus, Search, Trash2, Pencil, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  notes: string | null;
  proformasCount: number;
  createdAt: string;
};

export default function ClientsClient({
  initialItems,
  initialTotal,
  isAdmin
}: {
  initialItems: Client[];
  initialTotal: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState<keyof Client>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(items.map((i) => i.country).filter(Boolean))) as string[],
    [items]
  );

  const filtered = useMemo(() => {
    const list = items.filter((c) => {
      if (country && c.country !== country) return false;
      if (!q) return true;
      const hay = [c.name, c.companyName, c.email, c.phone, c.country, c.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    const ordered = [...list].sort((a, b) => {
      const av: any = (a as any)[sort] ?? '';
      const bv: any = (b as any)[sort] ?? '';
      const r = String(av).localeCompare(String(bv), 'ru', { numeric: true });
      return dir === 'asc' ? r : -r;
    });
    return ordered;
  }, [items, q, country, sort, dir]);

  async function deleteClient(id: string) {
    if (!confirm('Удалить клиента вместе со всеми его счетами?')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Не удалось удалить');
      return;
    }
    setItems((p) => p.filter((c) => c.id !== id));
    toast.success('Клиент удалён');
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="h1">Клиенты</h1>
          <p className="text-sm muted mt-1">{initialTotal} всего</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Создать клиента
          </button>
        )}
      </div>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
          <input className="input pl-9" placeholder="Поиск по имени, email, телефону..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Все страны</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input max-w-[180px]" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="createdAt">Сортировка: дата</option>
          <option value="name">Сортировка: имя</option>
          <option value="companyName">Сортировка: компания</option>
          <option value="country">Сортировка: страна</option>
          <option value="proformasCount">Сортировка: счетов</option>
        </select>
        <button className="btn-secondary" onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
          {dir === 'asc' ? '↑ Возр.' : '↓ Убыв.'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left muted">
              <th className="py-2.5 px-4 font-semibold">Имя</th>
              <th className="py-2.5 px-4 font-semibold">Компания</th>
              <th className="py-2.5 px-4 font-semibold">Страна</th>
              <th className="py-2.5 px-4 font-semibold">Email</th>
              <th className="py-2.5 px-4 font-semibold">Телефон</th>
              <th className="py-2.5 px-4 font-semibold text-right">Счетов</th>
              <th className="py-2.5 px-4 font-semibold">Создан</th>
              <th className="py-2.5 px-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-10 text-center muted">Нет данных</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-bg-subtle/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 muted">{c.companyName || '—'}</td>
                  <td className="px-4 py-2.5 muted">{c.country || '—'}</td>
                  <td className="px-4 py-2.5 muted">{c.email || '—'}</td>
                  <td className="px-4 py-2.5 muted">{c.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.proformasCount}</td>
                  <td className="px-4 py-2.5 muted">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost !p-1.5" title="Редактировать" onClick={() => setEditing(c)}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="btn-ghost !p-1.5 hover:!text-rose-500" title="Удалить" onClick={() => deleteClient(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClientFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(c) => {
          setItems((p) => [{
            id: c.id,
            name: c.name,
            companyName: c.companyName ?? null,
            email: c.email ?? null,
            phone: c.phone ?? null,
            country: c.country ?? null,
            notes: c.notes ?? null,
            proformasCount: 0,
            createdAt: c.createdAt
          }, ...p]);
        }}
      />
      <ClientFormModal
        open={!!editing}
        client={editing}
        onClose={() => setEditing(null)}
        onSaved={(c) => {
          setItems((p) => p.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
          router.refresh();
        }}
      />
    </div>
  );
}

function ClientFormModal({
  open,
  onClose,
  onSaved,
  client
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (c: any) => void;
  client?: Client | null;
}) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: client?.name || '',
    companyName: client?.companyName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    country: client?.country || '',
    notes: client?.notes || ''
  });
  // sync when reopening with different client
  useMemo(() => {
    setForm({
      name: client?.name || '',
      companyName: client?.companyName || '',
      email: client?.email || '',
      phone: client?.phone || '',
      country: client?.country || '',
      notes: client?.notes || ''
    });
  }, [client?.id]);

  if (!open) return null;
  const editing = !!client;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Редактировать клиента' : 'Новый клиент'}
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn-primary"
            disabled={pending || !form.name.trim()}
            onClick={() => {
              start(async () => {
                const url = editing ? `/api/clients/${client!.id}` : '/api/clients';
                const method = editing ? 'PATCH' : 'POST';
                const res = await fetch(url, {
                  method,
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(form)
                });
                const data = await res.json();
                if (!res.ok) {
                  toast.error(data?.error || 'Ошибка сохранения');
                  return;
                }
                toast.success(editing ? 'Сохранено' : 'Создано');
                onSaved({
                  ...data.client,
                  createdAt: data.client.createdAt || new Date().toISOString()
                });
                onClose();
              });
            }}
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Имя клиента *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Компания</label>
            <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div>
            <label className="label">Страна</label>
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Телефон</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Заметки</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
