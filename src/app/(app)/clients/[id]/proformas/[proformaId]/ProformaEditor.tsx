'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ChevronDown, Copy, Download, EyeOff, Eye, FileDown, Loader2,
  Palette, Plus, Settings2, Trash2, Upload, Paperclip
} from 'lucide-react';
import { CELL_COLORS, CURRENCIES, STATUS_LABELS, STATUS_TONES, cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';

type ColumnT = {
  id: string;
  name: string;
  type: string;
  width: number;
  order: number;
  hidden: boolean;
  options: string | null;
};
type RowT = { id: string; order: number; color: string | null };
type CellMap = Record<string, Record<string, { value: string | null; color: string | null }>>;
type AttachmentT = { id: string; name: string; storedName: string; size: number };

type Initial = {
  id: string;
  number: string;
  status: string;
  currency: string;
  date: string;
  notes: string | null;
  clientId: string;
  clientName: string;
  columns: ColumnT[];
  rows: RowT[];
  cells: CellMap;
  attachments: AttachmentT[];
};

type PendingCellUpdate = { rowId: string; columnId: string; value?: string | null; color?: string | null };

export default function ProformaEditor({ initial, isAdmin }: { initial: Initial; isAdmin: boolean }) {
  const router = useRouter();
  const [meta, setMeta] = useState({
    number: initial.number,
    status: initial.status,
    currency: initial.currency,
    date: initial.date.slice(0, 10),
    notes: initial.notes || ''
  });
  const [columns, setColumns] = useState<ColumnT[]>(initial.columns);
  const [rows, setRows] = useState<RowT[]>(initial.rows);
  const [cells, setCells] = useState<CellMap>(initial.cells);
  const [atts, setAtts] = useState<AttachmentT[]>(initial.attachments);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set()); // "rowId|colId"
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<{ rowId: string; columnId: string } | null>(null);
  const [columnsManagerOpen, setColumnsManagerOpen] = useState(false);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [savePending, setSavePending] = useState(false);

  // Debounced bulk cell saver
  const pendingUpdates = useRef<Map<string, PendingCellUpdate>>(new Map());
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const queueUpdate = useCallback((u: PendingCellUpdate) => {
    const key = `${u.rowId}|${u.columnId}`;
    const cur = pendingUpdates.current.get(key) || { rowId: u.rowId, columnId: u.columnId };
    pendingUpdates.current.set(key, {
      ...cur,
      ...(u.value !== undefined ? { value: u.value } : {}),
      ...(u.color !== undefined ? { color: u.color } : {})
    });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushUpdates, 350);
  }, []);

  const flushUpdates = useCallback(async () => {
    if (pendingUpdates.current.size === 0) return;
    const updates = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();
    setSavePending(true);
    try {
      const res = await fetch(`/api/proformas/${initial.id}/cells`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) toast.error('Не удалось сохранить ячейки');
    } finally {
      setSavePending(false);
    }
  }, [initial.id]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // Save meta on change (debounced)
  const metaTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(async () => {
      await fetch(`/api/proformas/${initial.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          number: meta.number,
          status: meta.status,
          currency: meta.currency,
          date: meta.date,
          notes: meta.notes
        })
      });
    }, 500);
  }, [meta, initial.id]);

  // Helpers
  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  function setCellValue(rowId: string, columnId: string, value: string | null) {
    setCells((p) => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), [columnId]: { ...(p[rowId]?.[columnId] || { color: null }), value } }
    }));
    queueUpdate({ rowId, columnId, value });
  }

  function setCellColor(rowId: string, columnId: string, color: string | null) {
    setCells((p) => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), [columnId]: { ...(p[rowId]?.[columnId] || { value: '' }), color } }
    }));
    queueUpdate({ rowId, columnId, color });
  }

  function setRangeColor(color: string | null) {
    if (selectedCells.size === 0) {
      if (activeCell) setCellColor(activeCell.rowId, activeCell.columnId, color);
      return;
    }
    selectedCells.forEach((k) => {
      const [rowId, columnId] = k.split('|');
      setCellColor(rowId!, columnId!, color);
    });
  }

  async function addRow(count = 1) {
    const res = await fetch(`/api/proformas/${initial.id}/rows`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data?.error || 'Ошибка'); return; }
    setRows((p) => [...p, ...data.rows.map((r: any) => ({ id: r.id, order: r.order, color: r.color }))]);
  }

  async function duplicateRow(rowId: string) {
    const res = await fetch(`/api/proformas/${initial.id}/rows`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ duplicateRowId: rowId })
    });
    const data = await res.json();
    if (!res.ok) { toast.error('Ошибка'); return; }
    for (const r of data.rows) {
      setRows((p) => [...p, { id: r.id, order: r.order, color: r.color }]);
      const map: Record<string, { value: string | null; color: string | null }> = {};
      for (const c of r.cells) map[c.columnId] = { value: c.value, color: c.color };
      setCells((p) => ({ ...p, [r.id]: map }));
    }
  }

  async function deleteSelectedRows() {
    if (selectedRows.size === 0) return;
    if (!confirm(`Удалить ${selectedRows.size} строк(и)?`)) return;
    const ids = Array.from(selectedRows);
    const res = await fetch(`/api/proformas/${initial.id}/rows`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setRows((p) => p.filter((r) => !selectedRows.has(r.id)));
    setSelectedRows(new Set());
    toast.success('Удалено');
  }

  // Clipboard support
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingCell) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedCells.size > 0) {
        e.preventDefault();
        selectedCells.forEach((k) => {
          const [rowId, columnId] = k.split('|');
          setCellValue(rowId!, columnId!, '');
        });
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const list = Array.from(selectedCells.size ? selectedCells : (activeCell ? new Set([`${activeCell.rowId}|${activeCell.columnId}`]) : new Set<string>()));
      if (list.length > 0) {
        const map = new Map<string, Map<string, string>>();
        for (const k of list) {
          const [rowId, columnId] = k.split('|');
          if (!map.has(rowId!)) map.set(rowId!, new Map());
          map.get(rowId!)!.set(columnId!, cells[rowId!]?.[columnId!]?.value || '');
        }
        const orderedRows = rows.filter((r) => map.has(r.id));
        const orderedCols = visibleColumns.filter((c) => Array.from(map.values()).some((m) => m.has(c.id)));
        const text = orderedRows.map((r) =>
          orderedCols.map((c) => (map.get(r.id)?.get(c.id) || '').replace(/\t|\n/g, ' ')).join('\t')
        ).join('\n');
        navigator.clipboard.writeText(text).then(() => toast.success('Скопировано'));
        e.preventDefault();
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      if (!activeCell) return;
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const lines = text.replace(/\r/g, '').split('\n');
        const startRowIdx = rows.findIndex((r) => r.id === activeCell.rowId);
        const startColIdx = visibleColumns.findIndex((c) => c.id === activeCell.columnId);
        if (startRowIdx < 0 || startColIdx < 0) return;
        lines.forEach((line, ri) => {
          const cells = line.split('\t');
          const row = rows[startRowIdx + ri];
          if (!row) return;
          cells.forEach((val, ci) => {
            const col = visibleColumns[startColIdx + ci];
            if (!col) return;
            setCellValue(row.id, col.id, val);
          });
        });
      });
    }
  }, [editingCell, selectedCells, activeCell, rows, visibleColumns, cells]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  function startEditCell(rowId: string, columnId: string) {
    setEditingCell({ rowId, columnId });
    setDraftValue(cells[rowId]?.[columnId]?.value || '');
  }
  function commitEdit() {
    if (!editingCell) return;
    setCellValue(editingCell.rowId, editingCell.columnId, draftValue);
    setEditingCell(null);
  }

  async function deleteColumn(colId: string) {
    if (!confirm('Удалить колонку? Все данные в ней будут потеряны.')) return;
    const res = await fetch(`/api/proformas/${initial.id}/columns/${colId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setColumns((p) => p.filter((c) => c.id !== colId));
  }
  async function toggleHidden(col: ColumnT) {
    const res = await fetch(`/api/proformas/${initial.id}/columns/${col.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hidden: !col.hidden })
    });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setColumns((p) => p.map((c) => (c.id === col.id ? { ...c, hidden: !col.hidden } : c)));
  }
  async function renameColumn(col: ColumnT, name: string) {
    if (!name.trim()) return;
    const res = await fetch(`/api/proformas/${initial.id}/columns/${col.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) { toast.error('Ошибка'); return; }
    setColumns((p) => p.map((c) => (c.id === col.id ? { ...c, name } : c)));
  }
  async function reorderColumns(order: string[]) {
    setColumns((p) => {
      const map = new Map(p.map((c) => [c.id, c]));
      return order.map((id, idx) => ({ ...(map.get(id) as ColumnT), order: idx })).filter(Boolean) as ColumnT[];
    });
    await fetch(`/api/proformas/${initial.id}/columns`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order })
    });
  }

  async function exportXlsx(opts: { template: 'A' | 'B' | 'C'; rowIds?: string[]; columnIds?: string[] }) {
    const res = await fetch(`/api/proformas/${initial.id}/export`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(opts)
    });
    if (!res.ok) { toast.error('Ошибка экспорта'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initial.clientName}_${initial.number}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel сгенерирован');
  }

  function pickAttachment() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.xls,.xlsx,.doc,.docx,image/jpeg,image/png';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      fd.append('proformaId', initial.id);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Ошибка'); return; }
      setAtts((p) => [data.attachment, ...p]);
      toast.success('Загружено');
    };
    inp.click();
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <Link href={`/clients/${initial.clientId}`} className="inline-flex items-center gap-1.5 text-sm muted hover:text-text mb-3">
        <ArrowLeft className="w-4 h-4" /> К {initial.clientName}
      </Link>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input max-w-[200px] font-semibold"
            value={meta.number}
            onChange={(e) => setMeta({ ...meta, number: e.target.value })}
          />
          <input
            type="date"
            className="input max-w-[170px]"
            value={meta.date}
            onChange={(e) => setMeta({ ...meta, date: e.target.value })}
          />
          <select
            className="input max-w-[150px]"
            value={meta.currency}
            onChange={(e) => setMeta({ ...meta, currency: e.target.value })}
          >
            {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select
            className={cn('input max-w-[170px]', STATUS_TONES[meta.status])}
            value={meta.status}
            onChange={(e) => setMeta({ ...meta, status: e.target.value })}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs muted">{savePending ? 'Сохранение…' : 'Все изменения сохранены'}</span>
            <button className="btn-secondary" onClick={pickAttachment}>
              <Paperclip className="w-4 h-4" /> Файл
            </button>
            <button className="btn-secondary" onClick={() => setColumnsManagerOpen(true)}>
              <Settings2 className="w-4 h-4" /> Колонки
            </button>
            <button className="btn-primary" onClick={() => setExportOpen(true)}>
              <FileDown className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <div className="mt-3">
          <textarea
            className="input min-h-[40px]"
            placeholder="Примечание к счёту..."
            value={meta.notes}
            onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
          />
        </div>

        {atts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {atts.map((a) => (
              <a key={a.id} href={`/uploads/${a.storedName}`} target="_blank" rel="noreferrer" className="chip bg-bg-subtle hover:bg-bg-muted">
                <Paperclip className="w-3 h-3 mr-1" /> {a.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden spreadsheet">
        <div className="flex items-center justify-between px-3 h-11 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost !py-1.5" onClick={() => addRow(1)}><Plus className="w-4 h-4" /> Строка</button>
            <button
              className="btn-ghost !py-1.5"
              disabled={selectedRows.size === 0}
              onClick={() => Array.from(selectedRows).forEach(duplicateRow)}
            >
              <Copy className="w-4 h-4" /> Дублировать
            </button>
            <button
              className="btn-ghost !py-1.5 hover:!text-rose-500"
              disabled={selectedRows.size === 0}
              onClick={deleteSelectedRows}
            >
              <Trash2 className="w-4 h-4" /> Удалить
            </button>
            <div className="w-px h-5 bg-border mx-2" />
            <ColorMenu onPick={setRangeColor} />
          </div>
          <div className="muted text-xs">
            {selectedRows.size > 0 && <>Выделено строк: <b>{selectedRows.size}</b> · </>}
            Всего строк: <b>{rows.length}</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 38 }} />
              <col style={{ width: 44 }} />
              {visibleColumns.map((c) => <col key={c.id} style={{ width: c.width }} />)}
            </colgroup>
            <thead>
              <tr className="bg-bg-subtle/70">
                <th className="border-b border-r border-border px-2 py-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-brand-600"
                    checked={rows.length > 0 && selectedRows.size === rows.length}
                    onChange={(e) => setSelectedRows(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                  />
                </th>
                <th className="border-b border-r border-border px-1 py-2 muted text-[11px] text-center">#</th>
                {visibleColumns.map((c) => (
                  <th key={c.id} className="border-b border-r border-border px-2 py-2 text-left font-semibold relative group">
                    <input
                      defaultValue={c.name}
                      onBlur={(e) => { if (e.target.value !== c.name) renameColumn(c, e.target.value); }}
                      className="bg-transparent w-full font-semibold text-text outline-none focus:bg-bg/60 rounded px-1 -mx-1"
                    />
                    <span className="absolute top-0 right-0 hidden group-hover:flex items-center bg-panel border border-border rounded-bl-md">
                      <button onClick={() => toggleHidden(c)} className="p-1 text-text-subtle hover:text-text" title="Скрыть">
                        {c.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      {isAdmin && (
                        <button onClick={() => deleteColumn(c.id)} className="p-1 text-text-subtle hover:text-rose-500" title="Удалить колонку">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th className="border-b border-border px-2 py-2 text-center">
                  <button onClick={() => setAddColumnOpen(true)} className="text-text-muted hover:text-text" title="Добавить колонку">
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className={cn(idx % 2 === 1 && 'bg-bg-subtle/30')}>
                  <td className="border-b border-r border-border px-2 py-1.5 align-middle">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-brand-600"
                      checked={selectedRows.has(r.id)}
                      onChange={(e) => setSelectedRows((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(r.id); else n.delete(r.id);
                        return n;
                      })}
                    />
                  </td>
                  <td className="border-b border-r border-border px-1 py-1.5 muted text-[11px] text-center align-middle">{idx + 1}</td>
                  {visibleColumns.map((c) => {
                    const cell = cells[r.id]?.[c.id];
                    const key = `${r.id}|${c.id}`;
                    const selected = selectedCells.has(key);
                    const active = activeCell?.rowId === r.id && activeCell?.columnId === c.id;
                    const editing = editingCell?.rowId === r.id && editingCell?.columnId === c.id;
                    const color = cell?.color || null;
                    const colorBg = color && color !== 'none' ? CELL_COLORS[color]?.bg || '' : '';
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          'border-b border-r border-border align-middle p-0 relative',
                          colorBg,
                          active && 'outline outline-2 outline-brand-500 outline-offset-[-2px] z-10',
                          selected && !active && 'outline outline-1 outline-brand-400 outline-offset-[-1px]'
                        )}
                        onClick={(e) => {
                          setActiveCell({ rowId: r.id, columnId: c.id });
                          if (e.shiftKey) {
                            setSelectedCells((s) => {
                              const n = new Set(s);
                              n.add(key);
                              return n;
                            });
                          } else {
                            setSelectedCells(new Set([key]));
                          }
                        }}
                        onDoubleClick={() => startEditCell(r.id, c.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setColorPickerFor({ rowId: r.id, columnId: c.id });
                        }}
                      >
                        {editing ? (
                          <input
                            autoFocus
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { commitEdit(); }
                              if (e.key === 'Escape') { setEditingCell(null); }
                            }}
                            type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                            className="w-full h-full px-2 py-1.5 bg-bg outline-none border-0"
                          />
                        ) : (
                          <div className="px-2 py-1.5 truncate min-h-[28px]">
                            {cell?.value || <span className="text-text-subtle">&nbsp;</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-border" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="p-10 text-center muted text-sm">
            В этом счёте пока нет строк. <button className="text-brand-600 hover:underline" onClick={() => addRow(3)}>Добавить 3 строки</button>
          </div>
        )}
      </div>

      {colorPickerFor && (
        <div className="fixed inset-0 z-40" onClick={() => setColorPickerFor(null)}>
          <div className="absolute card p-1 shadow-pop" style={{ top: 80, left: 80 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              {Object.entries(CELL_COLORS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => {
                    setCellColor(colorPickerFor.rowId, colorPickerFor.columnId, k === 'none' ? null : k);
                    setColorPickerFor(null);
                  }}
                  className={cn(
                    'w-6 h-6 rounded border border-border',
                    v.bg || 'bg-panel'
                  )}
                  title={v.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {addColumnOpen && (
        <AddColumnModal
          onClose={() => setAddColumnOpen(false)}
          onAdded={(col) => setColumns((p) => [...p, col])}
          proformaId={initial.id}
        />
      )}

      {columnsManagerOpen && (
        <ColumnsManagerModal
          columns={columns}
          onClose={() => setColumnsManagerOpen(false)}
          onReorder={reorderColumns}
          onToggle={toggleHidden}
          onDelete={deleteColumn}
          onRename={renameColumn}
          isAdmin={isAdmin}
        />
      )}

      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          onExport={(opts) => { setExportOpen(false); exportXlsx(opts); }}
          totalRows={rows.length}
          selectedRows={selectedRows.size}
          allColumns={columns}
          rowIds={Array.from(selectedRows)}
        />
      )}
    </div>
  );
}

function ColorMenu({ onPick }: { onPick: (color: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn-ghost !py-1.5" onClick={() => setOpen((o) => !o)}>
        <Palette className="w-4 h-4" /> Цвет <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 card p-2 shadow-pop">
          <div className="flex gap-1">
            {Object.entries(CELL_COLORS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => { onPick(k === 'none' ? null : k); setOpen(false); }}
                className={cn('w-6 h-6 rounded border border-border', v.bg || 'bg-panel')}
                title={v.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddColumnModal({ onClose, onAdded, proformaId }: { onClose: () => void; onAdded: (c: ColumnT) => void; proformaId: string }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [pending, start] = useTransition();
  return (
    <Modal open onClose={onClose} title="Новая колонка" size="sm" footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary"
          disabled={pending || !name.trim()}
          onClick={() => start(async () => {
            const res = await fetch(`/api/proformas/${proformaId}/columns`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name, type })
            });
            const data = await res.json();
            if (!res.ok) { toast.error('Ошибка'); return; }
            onAdded({
              id: data.column.id, name: data.column.name, type: data.column.type,
              width: data.column.width, order: data.column.order,
              hidden: data.column.hidden, options: data.column.options
            });
            onClose();
          })}
        >{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать'}</button>
      </>
    }>
      <div className="space-y-3">
        <div>
          <label className="label">Название</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Тип</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="text">Текст</option>
            <option value="number">Число</option>
            <option value="date">Дата</option>
            <option value="select">Выбор</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function ColumnsManagerModal({ columns, onClose, onReorder, onToggle, onDelete, onRename, isAdmin }: {
  columns: ColumnT[];
  onClose: () => void;
  onReorder: (order: string[]) => void;
  onToggle: (c: ColumnT) => void;
  onDelete: (id: string) => void;
  onRename: (c: ColumnT, name: string) => void;
  isAdmin: boolean;
}) {
  const [list, setList] = useState(columns);
  useEffect(() => setList(columns), [columns]);
  function move(from: number, to: number) {
    if (to < 0 || to >= list.length) return;
    const n = [...list];
    const [it] = n.splice(from, 1);
    n.splice(to, 0, it!);
    setList(n);
    onReorder(n.map((x) => x.id));
  }
  return (
    <Modal open onClose={onClose} title="Управление колонками" size="md" footer={<button className="btn-secondary" onClick={onClose}>Готово</button>}>
      <ul className="space-y-1">
        {list.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 bg-bg-subtle rounded-lg p-2">
            <span className="muted text-xs w-6 text-center">{i + 1}</span>
            <input
              defaultValue={c.name}
              onBlur={(e) => { if (e.target.value !== c.name) onRename(c, e.target.value); }}
              className="input !py-1.5 flex-1"
            />
            <span className="chip bg-bg text-text-muted">{c.type}</span>
            <button className="btn-ghost !p-1.5" onClick={() => move(i, i - 1)}>↑</button>
            <button className="btn-ghost !p-1.5" onClick={() => move(i, i + 1)}>↓</button>
            <button className="btn-ghost !p-1.5" onClick={() => onToggle(c)} title={c.hidden ? 'Показать' : 'Скрыть'}>
              {c.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            {isAdmin && (
              <button className="btn-ghost !p-1.5 hover:!text-rose-500" onClick={() => onDelete(c.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ExportModal({ onClose, onExport, totalRows, selectedRows, allColumns, rowIds }: {
  onClose: () => void;
  onExport: (opts: { template: 'A' | 'B' | 'C'; rowIds?: string[]; columnIds?: string[] }) => void;
  totalRows: number;
  selectedRows: number;
  allColumns: ColumnT[];
  rowIds: string[];
}) {
  const [template, setTemplate] = useState<'A' | 'B' | 'C'>('A');
  const [scope, setScope] = useState<'all' | 'selected'>(selectedRows > 0 ? 'selected' : 'all');
  const [cols, setCols] = useState<Set<string>>(new Set(allColumns.filter((c) => !c.hidden).map((c) => c.id)));
  return (
    <Modal open onClose={onClose} title="Экспорт в Excel" size="md" footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary"
          onClick={() => onExport({
            template,
            rowIds: scope === 'selected' ? rowIds : undefined,
            columnIds: Array.from(cols)
          })}
        ><Download className="w-4 h-4" /> Скачать XLSX</button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <div className="label">Шаблон</div>
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', 'C'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={cn(
                  'card p-3 text-left transition',
                  template === t && '!border-brand-500 ring-2 ring-brand-500/30'
                )}
              >
                <div className="font-semibold">Template {t}</div>
                <div className="text-xs muted mt-0.5">
                  {t === 'A' ? 'Классический · тёмная шапка' :
                   t === 'B' ? 'Фирменный · фиолетовая шапка' :
                              'Тёплый · золотистая шапка'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Строки</div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
              Все ({totalRows})
            </label>
            <label className={cn('flex items-center gap-2 text-sm', selectedRows === 0 && 'opacity-50')}>
              <input type="radio" name="scope" checked={scope === 'selected'} disabled={selectedRows === 0} onChange={() => setScope('selected')} />
              Только выбранные ({selectedRows})
            </label>
          </div>
        </div>

        <div>
          <div className="label">Колонки</div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-auto">
            {allColumns.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm bg-bg-subtle rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={cols.has(c.id)}
                  onChange={(e) => setCols((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(c.id); else n.delete(c.id);
                    return n;
                  })}
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
