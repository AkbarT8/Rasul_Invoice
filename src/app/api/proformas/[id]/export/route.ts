import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError, requireUser, userCanAccessClient } from '@/lib/rbac';
import { buildWorkbook, type ExportInput } from '@/lib/excel';
import { STATUS_LABELS, formatDate } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if (u.response) return u.response;

  const p = await prisma.proforma.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      columns: { orderBy: { order: 'asc' } },
      rows: { orderBy: { order: 'asc' }, include: { cells: true } }
    }
  });
  if (!p) return jsonError('Not found', 404);
  if (!(await userCanAccessClient(u.user, p.clientId))) return jsonError('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const template = (['A', 'B', 'C'].includes(body?.template) ? body.template : 'A') as 'A' | 'B' | 'C';
  const rowIds: string[] | undefined = Array.isArray(body?.rowIds) && body.rowIds.length > 0 ? body.rowIds : undefined;
  const columnIds: string[] | undefined = Array.isArray(body?.columnIds) && body.columnIds.length > 0 ? body.columnIds : undefined;

  const visibleColumns = p.columns.filter((c) => !c.hidden && (!columnIds || columnIds.includes(c.id)));
  const selectedRows = rowIds ? p.rows.filter((r) => rowIds.includes(r.id)) : p.rows;

  const input: ExportInput = {
    template,
    title: `${p.client.name} — ${p.number}`,
    subtitle: `Proforma ${p.number} · ${formatDate(p.date)} · ${STATUS_LABELS[p.status] || p.status}`,
    meta: [
      { label: 'Client',  value: p.client.companyName ? `${p.client.name} (${p.client.companyName})` : p.client.name },
      { label: 'Country', value: p.client.country || '—' },
      { label: 'Email',   value: p.client.email || '—' },
      { label: 'Currency', value: p.currency }
    ],
    columns: visibleColumns.map((c) => ({ id: c.id, name: c.name, width: c.width, type: c.type })),
    rows: selectedRows.map((r) => {
      const cellMap: ExportInput['rows'][number]['cells'] = {};
      for (const c of r.cells) {
        cellMap[c.columnId] = { value: c.value ?? '', color: c.color ?? r.color ?? null };
      }
      return { id: r.id, cells: cellMap };
    })
  };

  const buf = await buildWorkbook(input);
  const fname = `${p.client.name.replace(/[^a-z0-9\-_ ]+/gi, '_')}_${p.number.replace(/[^a-z0-9\-_ ]+/gi, '_')}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length': String(buf.length)
    }
  });
}
