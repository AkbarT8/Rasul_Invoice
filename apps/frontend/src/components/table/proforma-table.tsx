"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download, Eye, GripVertical, PaintBucket, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
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
  const router = useRouter();
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [exportColumns, setExportColumns] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, number>>({});

  async function refresh() {
    const payload = await apiFetch<{ proforma: Proforma }>(`/proformas/${proformaId}`);
    setProforma(payload.proforma);
    setColumns(payload.proforma.columns ?? []);
    setRows(payload.proforma.rows ?? []);
    const visible = (payload.proforma.columns ?? []).filter((column) => !column.hidden);
    setExportColumns(new Set(visible.map((column) => column.key)));
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [proformaId]);

  const visibleColumns = useMemo(() => columns.filter((column) => !column.hidden).sort((a, b) => a.position - b.position), [columns]);
  const hiddenColumns = useMemo(() => columns.filter((column) => column.hidden), [columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
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
    setExportColumns((current) => new Set([...current, payload.column.key]));
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
    setExportColumns((current) => {
      const next = new Set(current);
      next.delete(column.key);
      return next;
    });
    await apiFetch(`/proformas/${proformaId}/columns/${column.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hidden: true })
    });
  }

  async function showColumn(column: CustomColumn) {
    setColumns((current) => current.map((item) => (item.id === column.id ? { ...item, hidden: false } : item)));
    setExportColumns((current) => new Set([...current, column.key]));
    await apiFetch(`/proformas/${proformaId}/columns/${column.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hidden: false })
    });
  }

  async function deleteColumn(column: CustomColumn) {
    if (!window.confirm(`Delete column "${column.name}"?`)) return;
    await apiFetch(`/proformas/${proformaId}/columns/${column.id}`, { method: "DELETE" });
    setColumns((current) => current.filter((item) => item.id !== column.id));
  }

  async function moveColumn(columnId: string, direction: -1 | 1) {
    const ordered = [...visibleColumns];
    const index = ordered.findIndex((column) => column.id === columnId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    setColumns((current) => {
      const positions = new Map(swapped.map((column, position) => [column.id, position]));
      return current.map((column) => (positions.has(column.id) ? { ...column, position: positions.get(column.id)! } : column));
    });
    await apiFetch(`/proformas/${proformaId}/columns/reorder`, {
      method: "POST",
      body: JSON.stringify({ columnIds: swapped.map((column) => column.id) })
    });
  }

  async function reorderColumns(dragId: string, dropId: string) {
    if (dragId === dropId) return;
    const ordered = [...visibleColumns];
    const from = ordered.findIndex((column) => column.id === dragId);
    const to = ordered.findIndex((column) => column.id === dropId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setColumns((current) => {
      const positions = new Map(ordered.map((column, position) => [column.id, position]));
      return current.map((column) => (positions.has(column.id) ? { ...column, position: positions.get(column.id)! } : column));
    });
    await apiFetch(`/proformas/${proformaId}/columns/reorder`, {
      method: "POST",
      body: JSON.stringify({ columnIds: ordered.map((column) => column.id) })
    });
  }

  async function addRow() {
    const payload = await apiFetch<{ row: ArticleRow }>(`/proformas/${proformaId}/rows`, {
      method: "POST",
      body: JSON.stringify({ cells: {}, colors: {} })
    });
    setRows((current) => [...current, payload.row]);
  }

  async function deleteRow(rowId: string) {
    await apiFetch(`/proformas/${proformaId}/rows/bulk`, {
      method: "POST",
      body: JSON.stringify({ rowIds: [rowId], action: "delete" })
    });
    setRows((current) => current.filter((row) => row.id !== rowId));
    setSelectedRows((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
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

  async function exportExcel(scope: "all" | "selected" | "columns") {
    const columnKeys =
      scope === "columns"
        ? Array.from(exportColumns)
        : scope === "all"
          ? visibleColumns.map((column) => column.key)
          : visibleColumns.map((column) => column.key);

    const blob = await apiFetch<Blob>(`/exports/proformas/${proformaId}`, {
      method: "POST",
      body: JSON.stringify({
        rowIds: scope === "selected" ? Array.from(selectedRows) : undefined,
        columnKeys: columnKeys.length ? columnKeys : undefined,
        template: "A"
      })
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${proforma?.proformaNumber ?? "proforma"}-${scope}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteProforma() {
    if (!window.confirm("Delete this proforma workspace?")) return;
    await apiFetch(`/proformas/${proformaId}`, { method: "DELETE" });
    router.push("/dashboard");
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

  function toggleExportColumn(key: string) {
    setExportColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!proforma) return <div className="text-sm text-slate-500">Loading proforma workspace...</div>;

  const gridCols = `40px repeat(${visibleColumns.length}, minmax(140px, 1fr)) 36px`;

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <button type="button" className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" onClick={() => router.push(`/clients/${proforma.clientId}`)}>
            <ChevronLeft size={14} /> Back to client
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Spreadsheet</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{proforma.proformaNumber}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {proforma.client?.companyName} · {formatDate(proforma.date)} · {proforma.currency}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={proforma.status} />
          <Button variant="secondary" size="sm" onClick={() => exportExcel("all")}>
            <Download size={14} /> All rows
          </Button>
          <Button variant="secondary" size="sm" disabled={!selectedRows.size} onClick={() => exportExcel("selected")}>
            Selected rows
          </Button>
          <Button variant="primary" size="sm" disabled={!exportColumns.size} onClick={() => exportExcel("columns")}>
            Selected cols
          </Button>
          <Button variant="danger" size="sm" onClick={deleteProforma}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 py-3">
          <Textarea
            className="min-h-[60px] text-sm"
            value={proforma.notes ?? ""}
            onChange={(event) => setProforma({ ...proforma, notes: event.target.value })}
            onBlur={() =>
              apiFetch(`/proformas/${proformaId}`, {
                method: "PATCH",
                body: JSON.stringify({ notes: proforma.notes })
              }).catch(() => undefined)
            }
            placeholder="Proforma notes (auto-saved)"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 max-w-[200px] text-sm" placeholder="New column" value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} onKeyDown={(e) => e.key === "Enter" && addColumn()} />
            <Button type="button" size="sm" onClick={addColumn}>
              <Plus size={14} /> Column
            </Button>
            <Button variant="secondary" size="sm" onClick={addRow}>
              <Plus size={14} /> Row
            </Button>
          </div>
          {hiddenColumns.length ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>Hidden:</span>
              {hiddenColumns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 dark:border-slate-700"
                  onClick={() => showColumn(column)}
                >
                  <Eye size={12} /> {column.name}
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="text-sm font-semibold">{rows.length} rows · edits auto-save</div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" disabled={!selectedRows.size} onClick={() => bulk("duplicate")}>
              Duplicate
            </Button>
            <Button variant="danger" size="sm" disabled={!selectedRows.size} onClick={() => bulk("delete")}>
              Delete selected
            </Button>
            {Object.keys(cellColors).map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Color ${color}`}
                disabled={!selectedRows.size}
                className="h-7 w-7 rounded-md border border-slate-200 disabled:opacity-40 dark:border-slate-700"
                style={{ background: cellColors[color] }}
                onClick={() => bulk("changeColor", color)}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto rounded-b-xl border-t border-slate-100 dark:border-slate-800" ref={parentRef} style={{ height: "min(68vh, 720px)" }}>
            <div className="sticky top-0 z-10 grid min-w-max border-b border-slate-200 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" style={{ gridTemplateColumns: gridCols }}>
              <div className="flex items-center justify-center px-1 py-2">#</div>
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  className="group flex items-center gap-0.5 border-l border-slate-200 px-1 py-1 dark:border-slate-800"
                  draggable
                  onDragStart={() => setDragColumnId(column.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragColumnId) reorderColumns(dragColumnId, column.id);
                    setDragColumnId(null);
                  }}
                >
                  <GripVertical size={12} className="shrink-0 text-slate-400" />
                  <input
                    type="checkbox"
                    className="h-3 w-3 shrink-0"
                    checked={exportColumns.has(column.key)}
                    onChange={() => toggleExportColumn(column.key)}
                    title="Include in column export"
                  />
                  <input
                    className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[11px] font-semibold normal-case outline-none"
                    value={column.name}
                    onChange={(event) => setColumns((current) => current.map((item) => (item.id === column.id ? { ...item, name: event.target.value } : item)))}
                    onBlur={(event) => renameColumn(column, event.target.value)}
                  />
                  <button type="button" className="rounded p-0.5 opacity-60 hover:opacity-100" onClick={() => moveColumn(column.id, -1)} aria-label="Move left">
                    <ArrowLeft size={12} />
                  </button>
                  <button type="button" className="rounded p-0.5 opacity-60 hover:opacity-100" onClick={() => moveColumn(column.id, 1)} aria-label="Move right">
                    <ArrowRight size={12} />
                  </button>
                  <button type="button" className="hidden px-1 text-[10px] text-slate-400 group-hover:inline" onClick={() => hideColumn(column)}>
                    hide
                  </button>
                  <button type="button" className="hidden px-1 text-[10px] text-rose-500 group-hover:inline" onClick={() => deleteColumn(column)}>
                    ×
                  </button>
                </div>
              ))}
              <div />
            </div>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }} className="min-w-max">
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={row.id}
                    className="absolute left-0 grid border-b border-slate-100 text-sm dark:border-slate-800/80"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: gridCols
                    }}
                  >
                    <div className="flex h-9 items-center justify-center bg-white dark:bg-slate-950">
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
                        className={cn(
                          "h-9 border-l border-slate-100 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        )}
                        style={{ backgroundColor: row.colors[column.key] ? cellColors[row.colors[column.key]] : undefined }}
                        value={String(row.cells[column.key] ?? "")}
                        onFocus={() => setActiveCell({ rowId: row.id, columnKey: column.key })}
                        onChange={(event) => updateCell(row.id, column.key, event.target.value)}
                      />
                    ))}
                    <button type="button" className="flex h-9 items-center justify-center text-slate-400 hover:text-rose-500" onClick={() => deleteRow(row.id)} aria-label="Delete row">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <PaintBucket size={13} /> Drag column headers to reorder · check columns for Excel export · tabular paste supported
      </p>
    </div>
  );
}
