'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/Modal';
import { Plus, Trash2, Loader2, KeyRound, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, cn } from '@/lib/utils';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  clientIds: string[];
};
type ClientLite = { id: string; name: string };

export default function SettingsClient({
  currentUserId,
  users: initialUsers,
  clients
}: {
  currentUserId: string;
  users: User[];
  clients: ClientLite[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  async function del(u: User) {
    if (u.id === currentUserId) { toast.error('Нельзя удалить себя'); return; }
    if (!confirm(`Удалить пользователя ${u.email}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setUsers((p) => p.filter((x) => x.id !== u.id));
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="h1">Пользователи и доступы</h1>
          <p className="text-sm muted mt-1">Управление учётными записями системы</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Создать пользователя
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left muted">
              <th className="px-4 py-2.5 font-semibold">Имя</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Роль</th>
              <th className="px-4 py-2.5 font-semibold">Доступ к клиентам</th>
              <th className="px-4 py-2.5 font-semibold">Создан</th>
              <th className="px-4 py-2.5 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-bg-subtle/50">
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 muted">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'chip',
                    u.role === 'ADMIN' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  )}>{u.role}</span>
                </td>
                <td className="px-4 py-2.5 muted">
                  {u.role === 'ADMIN' ? 'все' : u.clientIds.length === 0 ? '— нет —' : `${u.clientIds.length} клиент(ов)`}
                </td>
                <td className="px-4 py-2.5 muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button className="btn-ghost !p-1.5" onClick={() => setEditing(u)} title="Редактировать"><Pencil className="w-4 h-4" /></button>
                    {u.id !== currentUserId && (
                      <button className="btn-ghost !p-1.5 hover:!text-rose-500" onClick={() => del(u)} title="Удалить"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <UserFormModal
          mode="create"
          clients={clients}
          onClose={() => setCreateOpen(false)}
          onSaved={(u) => { setUsers((p) => [u, ...p]); setCreateOpen(false); }}
        />
      )}
      {editing && (
        <UserFormModal
          mode="edit"
          user={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={(u) => { setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, ...u } : x))); setEditing(null); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ mode, user, clients, onClose, onSaved }: {
  mode: 'create' | 'edit';
  user?: User;
  clients: ClientLite[];
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>((user?.role as any) || 'USER');
  const [clientIds, setClientIds] = useState<Set<string>>(new Set(user?.clientIds || []));
  const [pending, start] = useTransition();

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Новый пользователь' : `Изменить · ${user!.email}`} size="md" footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary"
          disabled={pending || !name.trim() || (mode === 'create' && (!email.trim() || password.length < 8))}
          onClick={() => start(async () => {
            const url = mode === 'create' ? '/api/users' : `/api/users/${user!.id}`;
            const method = mode === 'create' ? 'POST' : 'PATCH';
            const body: any = { name, role, clientIds: Array.from(clientIds) };
            if (mode === 'create') { body.email = email; body.password = password; }
            else if (password) body.password = password;

            const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { toast.error(data?.error || 'Ошибка'); return; }
            toast.success('Сохранено');
            onSaved({
              id: data.user?.id || user?.id || '',
              email: data.user?.email || email || user?.email || '',
              name,
              role,
              createdAt: data.user?.createdAt || user?.createdAt || new Date().toISOString(),
              clientIds: Array.from(clientIds)
            });
          })}
        >{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}</button>
      </>
    }>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Имя *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === 'edit'} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{mode === 'edit' ? 'Новый пароль (мин. 8)' : 'Пароль * (мин. 8)'}</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
              <input className="input pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'edit' ? '(не менять)' : ''} />
            </div>
          </div>
          <div>
            <label className="label">Роль</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        {role === 'USER' && (
          <div>
            <label className="label">Доступ к клиентам</label>
            <div className="max-h-[200px] overflow-auto card !p-2 grid grid-cols-2 gap-1">
              {clients.length === 0 ? (
                <div className="muted text-sm p-2">Нет клиентов в системе</div>
              ) : clients.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm bg-bg-subtle rounded px-2 py-1.5">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={clientIds.has(c.id)}
                    onChange={(e) => setClientIds((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(c.id); else n.delete(c.id);
                      return n;
                    })}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
