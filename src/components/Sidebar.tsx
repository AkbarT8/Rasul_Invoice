'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Search, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Me = { id: string; email: string; name: string; role: 'ADMIN' | 'USER' } | null;

const NAV = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/clients',   label: 'Клиенты', icon: Users },
  { href: '/search',    label: 'Поиск',   icon: Search }
];

export default function Sidebar({ me }: { me: Me }) {
  const path = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try { localStorage.setItem('theme', next); } catch {}
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Вы вышли из системы');
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="h-screen sticky top-0 w-[240px] shrink-0 border-r border-border bg-panel flex flex-col">
      <div className="px-5 h-14 flex items-center gap-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600 grid place-items-center text-white font-bold text-sm">R</div>
        <div className="text-sm font-semibold tracking-tight">Rasul Proforma</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + '/');
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white shadow-sm' : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              )}
            >
              <Icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
        {me?.role === 'ADMIN' && (
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              (path === '/settings' || path.startsWith('/settings/'))
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-bg-subtle'
            )}
          >
            <Settings className="w-4 h-4" />
            Настройки
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-bg-subtle"
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'dark' ? 'Тёмная' : 'Светлая'} тема
          </span>
        </button>

        <div className="mt-2 px-3 py-2.5 rounded-lg bg-bg-subtle">
          <div className="text-sm font-medium truncate">{me?.name || '—'}</div>
          <div className="text-xs muted truncate">{me?.email || '—'}</div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className={cn(
              'chip',
              me?.role === 'ADMIN' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            )}>
              {me?.role === 'ADMIN' ? 'Admin' : 'User'}
            </span>
            <button onClick={logout} className="text-xs muted hover:text-rose-500 inline-flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Выйти
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
