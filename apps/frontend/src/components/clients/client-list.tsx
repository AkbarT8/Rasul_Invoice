"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Client } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

type ClientsResponse = {
  items: Client[];
  total: number;
  page: number;
  pageSize: number;
};

const emptyClient = { name: "", companyName: "", email: "", phone: "", country: "", notes: "" };

export function ClientList() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [draft, setDraft] = useState(emptyClient);
  const [creating, setCreating] = useState(false);

  const params = useMemo(() => new URLSearchParams({ page: String(page), pageSize: "20", search: query }), [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<ClientsResponse>(`/clients?${params}`).then(setData).catch(() => undefined);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [params]);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch<{ client: Client }>("/clients", {
      method: "POST",
      body: JSON.stringify(draft)
    });
    setDraft(emptyClient);
    setCreating(false);
    const refreshed = await apiFetch<ClientsResponse>(`/clients?${params}`);
    setData(refreshed);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clients</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Client management</h1>
        </div>
        {user?.role === "ADMIN" ? (
          <Button onClick={() => setCreating((value) => !value)}>
            <Plus size={16} /> Create Client
          </Button>
        ) : null}
      </div>

      {creating ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">New client</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={createClient} className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Client name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
              <Input
                placeholder="Company name"
                value={draft.companyName}
                onChange={(event) => setDraft({ ...draft, companyName: event.target.value })}
                required
              />
              <Input placeholder="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              <Input placeholder="Phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <Input placeholder="Country" value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
              <Textarea
                className="md:col-span-3"
                placeholder="Rich business notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
              <div className="md:col-span-3">
                <Button type="submit">Save client</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold">{data?.total ?? 0} clients</h2>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
            <Input className="pl-9" placeholder="Search, sort, filter..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Country</th>
                  <th className="px-5 py-3">Proformas</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.items.map((client) => (
                  <tr key={client.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                      <div className="text-xs text-slate-500">{client.email}</div>
                    </td>
                    <td className="px-5 py-3">{client.companyName}</td>
                    <td className="px-5 py-3 text-slate-500">{client.country ?? "-"}</td>
                    <td className="px-5 py-3">{client._count?.proformas ?? 0}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(client.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <span className="text-slate-500">Page {page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!data || page * data.pageSize >= data.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
