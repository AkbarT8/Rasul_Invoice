'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, remember })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || 'Ошибка входа');
        return;
      }
      toast.success(`Здравствуйте, ${data.user?.name || ''}`);
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.16),transparent_60%)] dark:[background:radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.25),transparent_60%)]" />
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-7">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-lg shadow-pop">R</div>
          <h1 className="mt-4 text-xl font-semibold">Rasul Proforma</h1>
          <p className="muted text-sm mt-1">Вход в систему управления заказами</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4 animate-in">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
              <input
                className="input pl-9"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
              <input
                className="input pl-9 pr-10"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={1}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-subtle hover:text-text"
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm muted select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-brand-600"
            />
            Запомнить меня
          </label>

          {err && (
            <div className="text-sm bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Войти'}
          </button>
        </form>

        <p className="muted text-xs text-center mt-4">
          Закрытая платформа. Доступ только по приглашению администратора.
        </p>
      </div>
    </main>
  );
}
