"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Folder, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Client, Proforma } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";

const emptyProforma = {
  proformaNumber: "",
  date: new Date().toISOString().slice(0, 10),
  currency: "USD",
  status: "DRAFT",
  notes: ""
};

export function ClientWorkspace({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editingProformaId, setEditingProformaId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyProforma);
  const [clientDraft, setClientDraft] = useState({ name: "", companyName: "", email: "", phone: "", country: "", notes: "" });

  async function refresh() {
    const payload = await apiFetch<{ client: Client }>(`/clients/${clientId}`);
    setClient(payload.client);
    setClientDraft({
      name: payload.client.name,
      companyName: payload.client.companyName,
      email: payload.client.email ?? "",
      phone: payload.client.phone ?? "",
      country: payload.client.country ?? "",
      notes: payload.client.notes ?? ""
    });
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [clientId]);

  async function createProforma(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = await apiFetch<{ proforma: Proforma }>("/proformas", {
      method: "POST",
      body: JSON.stringify({ ...draft, clientId })
    });
    setCreating(false);
    setDraft(emptyProforma);
    router.push(`/proformas/${payload.proforma.id}`);
  }

  async function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch(`/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(clientDraft) });
    setEditingClient(false);
    await refresh();
  }

  async function deleteClient() {
    if (!window.confirm("Delete this client and all proformas?")) return;
    await apiFetch(`/clients/${clientId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function deleteProforma(proformaId: string) {
    if (!window.confirm("Delete this proforma?")) return;
    await apiFetch(`/proformas/${proformaId}`, { method: "DELETE" });
    await refresh();
  }

  async function saveProforma(event: React.FormEvent<HTMLFormElement>, proformaId: string) {
    event.preventDefault();
    await apiFetch(`/proformas/${proformaId}`, { method: "PATCH", body: JSON.stringify(draft) });
    setEditingProformaId(null);
    setDraft(emptyProforma);
    await refresh();
  }

  function startEditProforma(proforma: Proforma) {
    setEditingProformaId(proforma.id);
    setDraft({
      proformaNumber: proforma.proformaNumber,
      date: proforma.date.slice(0, 10),
      currency: proforma.currency,
      status: proforma.status,
      notes: proforma.notes ?? ""
    });
  }

  if (!client) return <div className="text-sm text-slate-500">Loading client workspace...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Folder size={13} /> Client
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {client.companyName} · {client.country ?? "No country"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditingClient((value) => !value)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button size="sm" variant="danger" onClick={deleteClient}>
            <Trash2 size={14} /> Delete
          </Button>
          <Button size="sm" onClick={() => setCreating((value) => !value)}>
            <Plus size={14} /> Proforma
          </Button>
        </div>
      </div>

      {editingClient ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Edit client</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveClient} className="grid gap-2 sm:grid-cols-3">
              <Input value={clientDraft.name} onChange={(e) => setClientDraft({ ...clientDraft, name: e.target.value })} required />
              <Input value={clientDraft.companyName} onChange={(e) => setClientDraft({ ...clientDraft, companyName: e.target.value })} required />
              <Input value={clientDraft.email} onChange={(e) => setClientDraft({ ...clientDraft, email: e.target.value })} />
              <Input value={clientDraft.phone} onChange={(e) => setClientDraft({ ...clientDraft, phone: e.target.value })} />
              <Input value={clientDraft.country} onChange={(e) => setClientDraft({ ...clientDraft, country: e.target.value })} />
              <Textarea className="sm:col-span-3" value={clientDraft.notes} onChange={(e) => setClientDraft({ ...clientDraft, notes: e.target.value })} />
              <div className="sm:col-span-3">
                <Button type="submit" size="sm">
                  Save client
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : client.notes ? (
        <Card>
          <CardContent className="py-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{client.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {creating ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">New proforma</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={createProforma} className="grid gap-2 sm:grid-cols-4">
              <Input
                placeholder="Proforma number"
                value={draft.proformaNumber}
                onChange={(event) => setDraft({ ...draft, proformaNumber: event.target.value })}
                required
              />
              <Input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              <Input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} />
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                {["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <Textarea
                className="sm:col-span-4"
                placeholder="Notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
              <div className="sm:col-span-4">
                <Button type="submit" size="sm">
                  Create workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {editingProformaId ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Edit proforma</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => saveProforma(event, editingProformaId)} className="grid gap-2 sm:grid-cols-4">
              <Input value={draft.proformaNumber} onChange={(e) => setDraft({ ...draft, proformaNumber: e.target.value })} required />
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} />
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <div className="sm:col-span-4 flex gap-2">
                <Button type="submit" size="sm">
                  Save
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProformaId(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Proformas</h2>
        </CardHeader>
        <CardContent className="space-y-1.5 p-3">
          {client.proformas?.length ? (
            client.proformas.map((proforma) => (
              <div
                key={proforma.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
              >
                <Link href={`/proformas/${proforma.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-slate-900">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm">{proforma.proformaNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {proforma._count?.columns ?? 0} cols · {proforma._count?.rows ?? 0} rows · {formatDate(proforma.date)}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 pl-2">
                  <StatusBadge status={proforma.status} />
                  <Button variant="ghost" size="sm" onClick={() => startEditProforma(proforma)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteProforma(proforma.id)}>
                    <Trash2 size={14} className="text-rose-500" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">No proformas yet. Create one to open the spreadsheet workspace.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
