"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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

export function ClientsPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [draft, setDraft] = useState(emptyClient);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams({ page: String(page), pageSize: embedded ? "12" : "20", search: query }), [page, query, embedded]);

  async function load() {
    const refreshed = await apiFetch<ClientsResponse>(`/clients?${params}`);
    setData(refreshed);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch(() => undefined);
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
    await load();
  }

  async function saveClient(event: React.FormEvent<HTMLFormElement>, clientId: string) {
    event.preventDefault();
    await apiFetch(`/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(draft)
    });
    setEditingId(null);
    setDraft(emptyClient);
    await load();
  }

  async function deleteClient(clientId: string) {
    if (!window.confirm("Delete this client and all proformas?")) return;
    await apiFetch(`/clients/${clientId}`, { method: "DELETE" });
    await load();
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setDraft({
      name: client.name,
      companyName: client.companyName,
      email: client.email ?? "",
      phone: client.phone ?? "",
      country: client.country ?? "",
      notes: client.notes ?? ""
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          {!embedded ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clients</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Client management</h1>
            </>
          ) : (
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Clients</h2>
          )}
        </div>
        {user ? (
          <Button size="sm" onClick={() => setCreating((value) => !value)}>
            <Plus size={15} /> New client
          </Button>
        ) : null}
      </div>

      {(creating || editingId) && user ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{editingId ? "Edit client" : "New client"}</h2>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => (editingId ? saveClient(event, editingId) : createClient(event))}
              className="grid gap-2 sm:grid-cols-3"
            >
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
                className="sm:col-span-3"
                placeholder="Notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" size="sm">
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCreating(false);
                    setEditingId(null);
                    setDraft(emptyClient);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">{data?.total ?? 0} clients</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2 text-slate-400" size={15} />
            <Input className="h-9 pl-8 text-sm" placeholder="Search clients..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Proformas</th>
                  <th className="px-4 py-2.5">Updated</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data?.items.map((client) => (
                  <tr key={client.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                      <div className="text-xs text-slate-500">{client.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{client.companyName}</td>
                    <td className="px-4 py-2.5">{client._count?.proformas ?? 0}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(client.updatedAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(client)} aria-label="Edit client">
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteClient(client.id)} aria-label="Delete client">
                          <Trash2 size={14} className="text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!embedded ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm dark:border-slate-800">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <span className="text-xs text-slate-500">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data || page * data.pageSize >= data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : data && data.total > data.pageSize ? (
            <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => router.push("/clients")}>
                View all clients
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
