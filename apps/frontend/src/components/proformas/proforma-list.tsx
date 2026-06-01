"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Proforma } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";

type Response = { items: Proforma[]; total: number };

export function ProformaList() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Response | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<Response>(`/proformas?search=${encodeURIComponent(query)}&pageSize=50`).then(setData).catch(() => undefined);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Orders</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Proformas</h1>
      </div>
      <Card>
        <CardHeader>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search proformas..." />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.items.map((proforma) => (
              <Link key={proforma.id} href={`/proformas/${proforma.id}`} className="grid grid-cols-5 items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                <span className="font-medium">{proforma.proformaNumber}</span>
                <span className="text-slate-500">{proforma.client?.companyName}</span>
                <span>{proforma.currency}</span>
                <StatusBadge status={proforma.status} />
                <span className="text-right text-slate-500">{formatDate(proforma.date)}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
