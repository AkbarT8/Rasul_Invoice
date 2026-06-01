import ExcelJS from 'exceljs';
import { CELL_COLORS } from './utils';

export type ExportColumn = {
  id: string;
  name: string;
  width?: number;
  type?: string;
};
export type ExportRow = {
  id: string;
  cells: Record<string, { value?: string | null; color?: string | null } | undefined>;
};
export type ExportInput = {
  template?: 'A' | 'B' | 'C';
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
  columns: ExportColumn[];
  rows: ExportRow[];
};

function templateTheme(template: 'A' | 'B' | 'C' = 'A') {
  switch (template) {
    case 'B':
      return {
        title: { fg: 'FFFFFF', bg: '4338CA' },
        header: { fg: 'FFFFFF', bg: '4F46E5' },
        zebra: 'F5F3FF',
        accent: 'EDE9FE'
      };
    case 'C':
      return {
        title: { fg: '111827', bg: 'FDE68A' },
        header: { fg: '111827', bg: 'FEF3C7' },
        zebra: 'FFFBEB',
        accent: 'FEF3C7'
      };
    case 'A':
    default:
      return {
        title: { fg: 'FFFFFF', bg: '111827' },
        header: { fg: 'FFFFFF', bg: '374151' },
        zebra: 'F9FAFB',
        accent: 'F3F4F6'
      };
  }
}

export async function buildWorkbook(input: ExportInput): Promise<Buffer> {
  const theme = templateTheme(input.template);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rasul Proforma';
  wb.created = new Date();

  const ws = wb.addWorksheet(input.title.slice(0, 28) || 'Proforma', {
    views: [{ state: 'frozen', ySplit: 4 + (input.meta?.length ? input.meta.length + 1 : 0) }]
  });

  const colCount = Math.max(input.columns.length, 4);

  // Title
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = input.title;
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF' + theme.title.fg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + theme.title.bg } };
  ws.getRow(1).height = 32;

  // Subtitle
  if (input.subtitle) {
    ws.mergeCells(2, 1, 2, colCount);
    const sub = ws.getCell(2, 1);
    sub.value = input.subtitle;
    sub.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF6B7280' } };
    sub.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  let cursor = input.subtitle ? 3 : 2;

  // Meta block
  if (input.meta?.length) {
    cursor += 1;
    for (const m of input.meta) {
      const lbl = ws.getCell(cursor, 1);
      lbl.value = m.label;
      lbl.font = { bold: true, color: { argb: 'FF6B7280' } };
      ws.mergeCells(cursor, 2, cursor, colCount);
      ws.getCell(cursor, 2).value = m.value;
      cursor += 1;
    }
    cursor += 1;
  } else {
    cursor += 1;
  }

  // Header
  const headerRow = ws.getRow(cursor);
  input.columns.forEach((c, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = c.name;
    cell.font = { bold: true, color: { argb: 'FF' + theme.header.fg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + theme.header.bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });
  headerRow.height = 24;
  headerRow.commit();
  const headerRowNumber = cursor;
  cursor += 1;

  // Data rows
  input.rows.forEach((r, i) => {
    const row = ws.getRow(cursor);
    input.columns.forEach((c, idx) => {
      const data = r.cells[c.id];
      const raw = data?.value ?? '';
      const cell = row.getCell(idx + 1);
      // Try to coerce types
      if (c.type === 'number' && raw !== '' && !isNaN(Number(raw))) {
        cell.value = Number(raw);
        cell.numFmt = '#,##0.00';
      } else if (c.type === 'date' && raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          cell.value = d;
          cell.numFmt = 'dd.mm.yyyy';
        } else {
          cell.value = raw;
        }
      } else {
        cell.value = raw;
      }

      const tone = data?.color;
      const hex = tone && CELL_COLORS[tone]?.hex ? CELL_COLORS[tone].hex : null;
      const fg = hex ? hex : i % 2 === 1 ? theme.zebra : null;
      if (fg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fg } };
      }
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
    row.commit();
    cursor += 1;
  });

  // Column widths
  input.columns.forEach((c, idx) => {
    const data = input.rows.map((r) => String(r.cells[c.id]?.value ?? ''));
    const longest = Math.max(c.name.length, ...data.map((s) => Math.min(s.length, 50)));
    ws.getColumn(idx + 1).width = Math.max(12, Math.min(48, longest + 4));
  });

  // Auto filter
  if (input.rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: input.columns.length }
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
