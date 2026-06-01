"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";

type SearchPayload = {
  clients: Array<{ id: string; name: string; companyName: string }>;
  proformas: Array<{ id: string; proformaNumber: string; client?: { name: string } }>;
};

export function Topbar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPayload | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      apiFetch<SearchPayload>(`/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(setResults)
        .catch(() => undefined);
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[color:var(--background)]/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 lg:px-8">
      <div className="relative mx-auto max-w-7xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
        <Input
          className="h-10 max-w-xl pl-10"
          placeholder="Search clients, proformas, notes, articles, tracking numbers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {results ? (
          <div className="absolute left-0 top-12 z-30 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {[...results.clients.map((client) => ({ href: `/clients/${client.id}`, title: client.name, meta: client.companyName })),
              ...results.proformas.map((proforma) => ({
                href: `/proformas/${proforma.id}`,
                title: proforma.proformaNumber,
                meta: proforma.client?.name ?? "Proforma"
              }))].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => setQuery("")}
              >
                <span className="font-medium">{item.title}</span>
                <span className="ml-2 text-xs text-slate-500">{item.meta}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
