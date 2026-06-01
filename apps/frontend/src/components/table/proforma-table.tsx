"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, GripVertical, PaintBucket, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { ArticleRow, CustomColumn, Proforma } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";

const cellColors: Record<string, string> = {
  green: "#dcfce7",
  red: "#fee2e2",
  yellow: "#fef3c7",
  blue: "#dbeafe",
  purple: "#f3e8ff",
  orange: "#ffedd5"
};

export function ProformaTable({ proformaId }: { proformaId: string }) {
  const { user } = useAuth();
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, number>>({});

  async function refresh() {
    const payload = await apiFetch<{ proforma: Proforma }>(`/proformas/${proformaId}`);
    setProforma(payload.proforma);
    setColumns(payload.proforma.columns ?? []);
    setRows(payload.proforma.rows ?? []);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [proformaId]);

  const visibleColumns = useMemo(() => columns.filter((column) => !column.hidden), [columns]);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12
  });

  function queueSave(row: ArticleRow) {
    window.clearTimeout(saveTimers.current[row.id]);
    saveTimers.current[row.id] = window.setTimeout(() => {
      apiFetch(`/proformas/${proformaId}/rows/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ cells: row.cells, colors: row.colors, position: row.position })
      }).catch(() => undefined);
    }, 450);
  }

  function updateCell(rowId: string, columnKey: string, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const updated = { ...row, cells: { ...row.cells, [columnKey]: value } };
        queueSave(updated);
        return updated;
      })
    );
  }

  async function addColumn() {
    if (!newColumnName.trim()) return;
    const payload = await apiFetch<{ column: CustomColumn }>(`/proformas/${proformaId}/columns`, {
      method: "POST",
      body: JSON.stringify({ name: newColumnName.trim() })
    });
    setColumns((current) => [...current, payload.column]);
    setNewColumnName("");
  }

  async function renameColumn(column: CustomColumn, name: string) {
    setColumns((current) => current.map((item) => (item.id === column.id ? { ...item, name } : item)));
    await apiFetch(`/proformas/${proformaId}/columns/${column.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    });
  }

  async function hideColumn(column: CustomColumn) {
    setColumns((current) => current.map((item) => (item.id === column.id ? { ...item, hidden: true } : item)));
    await apiFetch(`/proformas/${proformaId}/columns/${column.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hidden: true })
    });
  }

  async function addRow() {
    const payload = await apiFetch<{ row: ArticleRow }>(`/proformas/${proformaId}/rows`, {
      method: "POST",
      body: JSON.stringify({ cells: {}, colors: {} })
    });
    setRows((current) => [...current, payload.row]);
  }

  async function bulk(action: "delete" | "duplicate" | "changeColor", color?: string) {
    const rowIds = Array.from(selectedRows);
    if (!rowIds.length) return;
    const columnKey = activeCell?.columnKey ?? visibleColumns[0]?.key;
    const response = await apiFetch<{ rows?: ArticleRow[] } | void>(`/proformas/${proformaId}/rows/bulk`, {
      method: "POST",
      body: JSON.stringify({ rowIds, action, color, columnKey })
    });
    if (action === "delete") {
      setRows((current) => current.filter((row) => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
    } else if (action === "duplicate" && response && "rows" in response) {
      setRows((current) => [...current, ...(response.rows ?? [])]);
    } else {
      refresh().catch(() => undefined);
    }
  }

  async function exportExcel(scope: "all" | "selected") {
    const blob = await apiFetch<Blob>(`/exports/proformas/${proformaId}`, {
      method: "POST",
      body: JSON.stringify({
        rowIds: scope === "selected" ? Array.from(selectedRows) : undefined,
        columnKeys: visibleColumns.map((column) => column.key),
        template: "A"
      })
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${proforma?.proformaNumber ?? "proforma"}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!activeCell) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const startRow = rows.findIndex((row) => row.id === activeCell.rowId);
    const startColumn = visibleColumns.findIndex((column) => column.key === activeCell.columnKey);
    const matrix = text.trimEnd().split(/\r?\n/).map((line) => line.split("\t"));
    setRows((current) => {
      const next = [...current];
      matrix.forEach((line, rowOffset) => {
        const row = next[startRow + rowOffset];
        if (!row) return;
        const cells = { ...row.cells };
        line.forEach((value, columnOffset) => {
          const column = visibleColumns[startColumn + columnOffset];
          if (column) cells[column.key] = value;
        });
        const updated = { ...row, cells };
        next[startRow + rowOffset] = updated;
        queueSave(updated);
      });
      return next;
    });
  }

  if (!proforma) return <div className="text-sm text-slate-500">Loading proforma workspace...</div>;

  return (
    <div className="space-y-5" onPaste={handlePaste}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proforma Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{proforma.proformaNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {proforma.client?.companyName} · {formatDate(proforma.date)} · {proforma.currency}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={proforma.status} />
          <Button variant="secondary" onClick={() => exportExcel("all")}>
            <Download size={16} /> Export All
          </Button>
          <Button variant="primary" disabled={!selectedRows.size} onClick={() => exportExcel("selected")}>
            Export Selected
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
            <Textarea
              value={proforma.notes ?? ""}
              onChange={(event) => setProforma({ ...proforma, notes: event.target.value })}
              onBlur={() =>
                apiFetch(`/proformas/${proformaId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ notes: proforma.notes })
                }).catch(() => undefined)
              }
              placeholder="Proforma notes"
            />
            {user?.role === "ADMIN" ? (
              <div className="flex gap-2">
                <Input placeholder="Add column" value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} />
                <Button type="button" onClick={addColumn}>
                  <Plus size={15} />
                </Button>
              </div>
            ) : null}
            <Button variant="secondary" onClick={addRow}>
              <Plus size={15} /> Add article
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">{rows.length} article rows</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!selectedRows.size} onClick={() => bulk("duplicate")}>Duplicate</Button>
            <Button variant="danger" size="sm" disabled={!selectedRows.size} onClick={() => bulk("delete")}>
              <Trash2 size={14} /> Delete
            </Button>
            {Object.keys(cellColors).map((color) => (
              <button
                key={color}
                aria-label={`Apply ${color}`}
                disabled={!selectedRows.size}
                className="h-8 w-8 rounded-full border border-slate-200 disabled:opacity-40"
                style={{ background: cellColors[color] }}
                onClick={() => bulk("changeColor", color)}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto" ref={parentRef} style={{ height: "64vh" }}>
            <div className="sticky top-0 z-10 grid min-w-max border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900" style={{ gridTemplateColumns: `48px repeat(${visibleColumns.length}, 180px)` }}>
              <div className="px-3 py-3">
                <GripVertical size={14} />
              </div>
              {visibleColumns.map((column) => (
                <div key={column.id} className="group flex items-center gap-2 border-l border-slate-200 px-3 py-3 dark:border-slate-800">
                  <input
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    value={column.name}
                    readOnly={user?.role !== "ADMIN"}
                    onChange={(event) => setColumns((current) => current.map((item) => item.id === column.id ? { ...item, name: event.target.value } : item))}
                    onBlur={(event) => renameColumn(column, event.target.value)}
                  />
                  {user?.role === "ADMIN" ? (
                    <button className="opacity-0 transition group-hover:opacity-100" onClick={() => hideColumn(column)}>
                      hide
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }} className="min-w-max">
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={row.id}
                    className="absolute left-0 grid border-b border-slate-100 text-sm dark:border-slate-800"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: `48px repeat(${visibleColumns.length}, 180px)`
                    }}
                  >
                    <div className="flex h-11 items-center justify-center bg-white dark:bg-slate-950">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={(event) =>
                          setSelectedRows((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          })
                        }
                      />
                    </div>
                    {visibleColumns.map((column) => (
                      <input
                        key={column.key}
                        className={cn("h-11 border-l border-slate-100 bg-white px-3 outline-none transition focus:ring-2 focus:ring-slate-300 dark:border-slate-800 dark:bg-slate-950")}
                        style={{ backgroundColor: row.colors[column.key] ? cellColors[row.colors[column.key]] : undefined }}
                        value={String(row.cells[column.key] ?? "")}
                        onFocus={() => setActiveCell({ rowId: row.id, columnKey: column.key })}
                        onChange={(event) => updateCell(row.id, column.key, event.target.value)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <PaintBucket size={14} /> Inline edits auto-save, cell colors persist, and spreadsheet paste supports tabular data.
      </div>
    </div>
  );
}
