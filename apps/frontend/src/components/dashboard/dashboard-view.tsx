"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Building2, CheckCircle2, Clock3, FileSpreadsheet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import type { DashboardSummary } from "@/types/domain";
import { ClientsPanel } from "@/components/clients/clients-panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";

const cards = [
  { key: "totalClients", label: "Clients", icon: Building2 },
  { key: "totalProformas", label: "Proformas", icon: FileSpreadsheet },
  { key: "totalArticles", label: "Rows", icon: Activity },
  { key: "pendingOrders", label: "Pending", icon: Clock3 },
  { key: "completedOrders", label: "Done", icon: CheckCircle2 }
] as const;

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    apiFetch<DashboardSummary>("/dashboard/summary").then(setSummary).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage clients, proformas, and spreadsheet workspaces.</p>
      </div>

      {summary ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="!p-0">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-900">
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">{card.label}</div>
                    <div className="text-xl font-semibold tabular-nums">{formatNumber(summary[card.key])}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {cards.map((card) => (
            <Skeleton key={card.key} className="h-16" />
          ))}
        </div>
      )}

      <ClientsPanel embedded />

      {summary?.recentProformas.length ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Recent proformas</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary.recentProformas.map((proforma) => (
                <Link
                  key={proforma.id}
                  href={`/proformas/${proforma.id}`}
                  className="grid grid-cols-2 items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900 sm:grid-cols-4"
                >
                  <span className="font-medium">{proforma.proformaNumber}</span>
                  <span className="text-slate-500">{proforma.client?.companyName}</span>
                  <StatusBadge status={proforma.status} />
                  <span className="text-right text-xs text-slate-500 sm:text-sm">{formatDate(proforma.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
