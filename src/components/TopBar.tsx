'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TopBar({ title, actions }: { title?: React.ReactNode; actions?: React.ReactNode }) {
  const [q, setQ] = useState('');
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="h-14 sticky top-0 z-10 bg-bg/85 backdrop-blur border-b border-border flex items-center gap-4 px-6">
      <div className="text-base font-semibold tracking-tight truncate flex-1">{title}</div>
      <form
        className="relative w-[320px] max-w-[50vw] hidden md:block"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Глобальный поиск...  (⌘K)"
          className="input pl-8 py-1.5 text-sm"
        />
      </form>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
