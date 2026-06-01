"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Folder, Plus } from "lucide-react";
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
  const [client, setClient] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyProforma);

  async function refresh() {
    const payload = await apiFetch<{ client: Client }>(`/clients/${clientId}`);
    setClient(payload.client);
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
    window.location.href = `/proformas/${payload.proforma.id}`;
  }

  if (!client) return <div className="text-sm text-slate-500">Loading client workspace...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Folder size={14} /> Client Workspace
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{client.companyName} · {client.country ?? "No country"}</p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}>
          <Plus size={16} /> Create Proforma
        </Button>
      </div>

      {client.notes ? (
        <Card>
          <CardContent>
            <h2 className="mb-2 text-sm font-semibold">Client notes</h2>
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
            <form onSubmit={createProforma} className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Proforma number"
                value={draft.proformaNumber}
                onChange={(event) => setDraft({ ...draft, proformaNumber: event.target.value })}
                required
              />
              <Input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              <Input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} />
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                {["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <Textarea
                className="md:col-span-4"
                placeholder="Proforma rich notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
              <div className="md:col-span-4">
                <Button type="submit">Create workspace</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Client / Proformas / Articles</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.proformas?.map((proforma) => (
            <Link
              key={proforma.id}
              href={`/proformas/${proforma.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-900">
                  <FileSpreadsheet size={17} />
                </div>
                <div>
                  <div className="font-medium">{proforma.proformaNumber}</div>
                  <div className="text-xs text-slate-500">
                    {proforma._count?.columns ?? 0} columns · {proforma._count?.rows ?? 0} articles · {formatDate(proforma.date)}
                  </div>
                </div>
              </div>
              <StatusBadge status={proforma.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
