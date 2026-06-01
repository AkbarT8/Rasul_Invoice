'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/Modal';
import { CURRENCIES, STATUS_LABELS, STATUS_TONES, formatDate } from '@/lib/utils';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Paperclip, Plus, Trash2, Upload } from 'lucide-react';

type ClientLite = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  notes: string | null;
};
type Proforma = {
  id: string;
  number: string;
  status: string;
  currency: string;
  date: string;
  notes: string | null;
  rowsCount: number;
  updatedAt: string;
};
type Attachment = {
  id: string;
  name: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export default function ClientDetailClient({
  client,
  proformas,
  attachments,
  canEdit
}: {
  client: ClientLite;
  proformas: Proforma[];
  attachments: Attachment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [list, setList] = useState(proformas);
  const [atts, setAtts] = useState(attachments);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function bulkAction(action: 'delete' | 'status', status?: string) {
    if (selected.size === 0) return;
    if (action === 'delete' && !confirm(`Удалить ${selected.size} счёт(а)?`)) return;
    const res = await fetch('/api/proformas/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action, status })
    });
    if (!res.ok) { toast.error('Ошибка'); return; }
    if (action === 'delete') {
      setList((p) => p.filter((x) => !selected.has(x.id)));
    } else if (action === 'status' && status) {
      setList((p) => p.map((x) => (selected.has(x.id) ? { ...x, status } : x)));
    }
    setSelected(new Set());
    toast.success('Готово');
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm muted hover:text-text mb-3">
        <ArrowLeft className="w-4 h-4" /> К списку клиентов
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="h1">{client.name}</h1>
              <div className="muted text-sm mt-1">
                {client.companyName ? `${client.companyName} · ` : ''}{client.country || 'без страны'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <select
                    className="input max-w-[160px]"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) bulkAction('status', e.target.value); }}
                  >
                    <option value="" disabled>Сменить статус...</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {canEdit && (
                    <button className="btn-danger" onClick={() => bulkAction('delete')}>
                      <Trash2 className="w-4 h-4" /> Удалить ({selected.size})
                    </button>
                  )}
                </>
              )}
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Новый счёт
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left muted">
                  <th className="px-3 py-2.5 w-9">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-brand-600"
                      checked={list.length > 0 && selected.size === list.length}
                      onChange={(e) => {
                        setSelected(e.target.checked ? new Set(list.map((l) => l.id)) : new Set());
                      }}
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Номер</th>
                  <th className="px-3 py-2.5 font-semibold">Дата</th>
                  <th className="px-3 py-2.5 font-semibold">Статус</th>
                  <th className="px-3 py-2.5 font-semibold">Валюта</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Позиций</th>
                  <th className="px-3 py-2.5 font-semibold">Обновлён</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.length === 0 ? (
                  <tr><td colSpan={7} className="p-10 text-center muted">У клиента пока нет счетов</td></tr>
                ) : list.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-subtle/50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-brand-600"
                        checked={selected.has(p.id)}
                        onChange={(e) => {
                          setSelected((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.add(p.id); else n.delete(p.id);
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/clients/${client.id}/proformas/${p.id}`} className="font-medium hover:underline inline-flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-brand-600" /> {p.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 muted">{formatDate(p.date)}</td>
                    <td className="px-3 py-2.5"><span className={`chip ${STATUS_TONES[p.status]}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                    <td className="px-3 py-2.5 muted">{CURRENCIES[p.currency] || p.currency} {p.currency}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.rowsCount}</td>
                    <td className="px-3 py-2.5 muted">{formatDate(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="h2 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Контакты</div>
            <dl className="text-sm space-y-2">
              <Row label="Email" value={client.email} />
              <Row label="Телефон" value={client.phone} />
              <Row label="Страна" value={client.country} />
            </dl>
            {client.notes && (
              <>
                <div className="divider my-3" />
                <div className="text-xs muted font-semibold uppercase tracking-wide mb-1">Заметки</div>
                <div className="text-sm whitespace-pre-wrap">{client.notes}</div>
              </>
            )}
          </div>

          <AttachmentsCard
            clientId={client.id}
            atts={atts}
            setAtts={setAtts}
          />
        </div>
      </div>

      {createOpen && (
        <ProformaCreateModal
          clientId={client.id}
          onClose={() => setCreateOpen(false)}
          onCreated={(p) => {
            setList((prev) => [{ ...p, rowsCount: 0, updatedAt: new Date().toISOString() }, ...prev]);
            router.push(`/clients/${client.id}/proformas/${p.id}`);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="muted">{label}</dt>
      <dd className="font-medium text-right truncate">{value || '—'}</dd>
    </div>
  );
}

function AttachmentsCard({ clientId, atts, setAtts }: {
  clientId: string;
  atts: Attachment[];
  setAtts: (fn: any) => void;
}) {
  const [pending, start] = useTransition();
  function pickFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.xls,.xlsx,.doc,.docx,image/jpeg,image/png';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      fd.append('clientId', clientId);
      start(async () => {
        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { toast.error(data?.error || 'Не удалось загрузить'); return; }
        setAtts((p: Attachment[]) => [data.attachment, ...p]);
        toast.success('Загружено');
      });
    };
    inp.click();
  }
  async function del(id: string) {
    if (!confirm('Удалить файл?')) return;
    const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setAtts((p: Attachment[]) => p.filter((a) => a.id !== id));
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h2 flex items-center gap-2"><Paperclip className="w-4 h-4" /> Файлы</div>
        <button className="btn-secondary" onClick={pickFile} disabled={pending}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Загрузить
        </button>
      </div>
      {atts.length === 0 ? (
        <div className="text-sm muted text-center py-6">Нет файлов</div>
      ) : (
        <ul className="space-y-1.5">
          {atts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 bg-bg-subtle rounded-lg px-3 py-2 text-sm">
              <a href={`/uploads/${a.storedName}`} target="_blank" rel="noreferrer" className="truncate hover:underline flex items-center gap-2 min-w-0">
                <Download className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                <span className="truncate">{a.name}</span>
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs muted">{Math.round(a.size / 1024)} KB</span>
                <button className="btn-ghost !p-1.5 hover:!text-rose-500" onClick={() => del(a.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProformaCreateModal({ clientId, onClose, onCreated }: {
  clientId: string;
  onClose: () => void;
  onCreated: (p: Proforma) => void;
}) {
  const [form, setForm] = useState({
    number: `INV-${Date.now().toString().slice(-6)}`,
    currency: 'USD',
    status: 'DRAFT',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [pending, start] = useTransition();
  return (
    <Modal open onClose={onClose} title="Новый счёт" size="md" footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary"
          disabled={pending || !form.number.trim()}
          onClick={() => start(async () => {
            const res = await fetch(`/api/clients/${clientId}/proformas`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data?.error || 'Ошибка'); return; }
            toast.success('Счёт создан');
            onCreated({
              id: data.proforma.id,
              number: data.proforma.number,
              status: data.proforma.status,
              currency: data.proforma.currency,
              date: data.proforma.date,
              notes: data.proforma.notes,
              rowsCount: 0,
              updatedAt: data.proforma.updatedAt || new Date().toISOString()
            });
            onClose();
          })}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать'}
        </button>
      </>
    }>
      <div className="space-y-3">
        <div>
          <label className="label">Номер счёта *</label>
          <input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Дата</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Валюта</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Статус</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Примечание</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
