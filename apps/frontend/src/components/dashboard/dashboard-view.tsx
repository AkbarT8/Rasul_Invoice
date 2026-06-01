"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Building2, CheckCircle2, Clock3, FileSpreadsheet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import type { DashboardSummary } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";

const cards = [
  { key: "totalClients", label: "Total Clients", icon: Building2 },
  { key: "totalProformas", label: "Total Proformas", icon: FileSpreadsheet },
  { key: "totalArticles", label: "Total Articles", icon: Activity },
  { key: "pendingOrders", label: "Pending Orders", icon: Clock3 },
  { key: "completedOrders", label: "Completed Orders", icon: CheckCircle2 }
] as const;

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    apiFetch<DashboardSummary>("/dashboard/summary").then(setSummary).catch(() => undefined);
  }, []);

  if (!summary) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-5">{cards.map((card) => <Skeleton key={card.key} className="h-32" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Executive dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="overflow-hidden">
              <CardContent className="relative">
                <div className="absolute right-4 top-4 rounded-2xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-900">
                  <Icon size={18} />
                </div>
                <div className="text-sm text-slate-500">{card.label}</div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">{formatNumber(summary[card.key])}</div>
                <div className="mt-4 h-1 rounded-full bg-slate-100 dark:bg-slate-900">
                  <div className="h-1 rounded-full bg-slate-950 dark:bg-white" style={{ width: `${62 + index * 6}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                className="grid grid-cols-4 items-center gap-4 px-5 py-3 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="font-medium">{proforma.proformaNumber}</span>
                <span className="text-slate-500">{proforma.client?.companyName}</span>
                <span>
                  <StatusBadge status={proforma.status} />
                </span>
                <span className="text-right text-slate-500">{formatDate(proforma.updatedAt)}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
