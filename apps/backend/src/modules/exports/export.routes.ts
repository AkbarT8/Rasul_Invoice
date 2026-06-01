import { Router } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { ensureProformaAccess } from "../../lib/access.js";

const router = Router();

const exportSchema = z.object({
  rowIds: z.array(z.string().uuid()).optional(),
  columnKeys: z.array(z.string()).optional(),
  template: z.enum(["A", "B", "C"]).default("A")
});

const colorMap: Record<string, string> = {
  green: "FFDFF7E8",
  red: "FFFFE5E5",
  yellow: "FFFFF6CC",
  blue: "FFDCEBFF",
  purple: "FFF0E7FF",
  orange: "FFFFE8D1"
};

function templateStyle(template: "A" | "B" | "C") {
  if (template === "B") return { header: "FF111827", font: "FFFFFFFF", accent: "FFEEF2FF" };
  if (template === "C") return { header: "FF0F766E", font: "FFFFFFFF", accent: "FFE6FFFB" };
  return { header: "FF0F172A", font: "FFFFFFFF", accent: "FFF8FAFC" };
}

router.use(requireAuth);

router.post(
  "/proformas/:proformaId",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, (req.params.proformaId as string));
    const body = exportSchema.parse(req.body);
    const proforma = await prisma.proforma.findUnique({
      where: { id: (req.params.proformaId as string) },
      include: {
        client: true,
        columns: { orderBy: { position: "asc" } },
        rows: { orderBy: { position: "asc" } }
      }
    });

    if (!proforma) throw new HttpError(404, "Proforma not found");

    const exportProforma = proforma as typeof proforma & {
      client: { name: string; companyName: string };
      columns: Array<{ key: string; name: string; hidden: boolean }>;
      rows: Array<{ id: string; cells: unknown; colors: unknown }>;
    };

    const selectedColumns = exportProforma.columns.filter((column) => {
      if (column.hidden && !body.columnKeys?.includes(column.key)) return false;
      return body.columnKeys?.length ? body.columnKeys.includes(column.key) : true;
    });
    const selectedRows = exportProforma.rows.filter((row) => (body.rowIds?.length ? body.rowIds.includes(row.id) : true));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Proforma OS";
    workbook.created = new Date();
    const style = templateStyle(body.template);
    const worksheet = workbook.addWorksheet(`Proforma ${proforma.proformaNumber}`, {
      views: [{ state: "frozen", ySplit: 5 }]
    });

    worksheet.mergeCells("A1:D1");
    worksheet.getCell("A1").value = `Proforma ${proforma.proformaNumber}`;
    worksheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FF0F172A" } };
    worksheet.getCell("A2").value = "Client";
    worksheet.getCell("B2").value = `${exportProforma.client.name} - ${exportProforma.client.companyName}`;
    worksheet.getCell("A3").value = "Date";
    worksheet.getCell("B3").value = proforma.date;
    worksheet.getCell("B3").numFmt = "yyyy-mm-dd";
    worksheet.getCell("C3").value = "Status";
    worksheet.getCell("D3").value = proforma.status;

    const headerRow = worksheet.getRow(5);
    selectedColumns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.name;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.header } };
      cell.font = { bold: true, color: { argb: style.font } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });

    selectedRows.forEach((row, rowIndex) => {
      const cells = row.cells as Record<string, unknown>;
      const colors = row.colors as Record<string, string>;
      const worksheetRow = worksheet.getRow(rowIndex + 6);
      selectedColumns.forEach((column, columnIndex) => {
        const cell = worksheetRow.getCell(columnIndex + 1);
        const value = cells[column.key];
        cell.value = value === undefined || value === null ? "" : String(value);
        cell.alignment = { vertical: "top", wrapText: true };
        const color = colors[column.key];
        if (color && colorMap[color]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMap[color] } };
        }
      });
    });

    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: Math.max(selectedColumns.length, 1) }
    };

    selectedColumns.forEach((column, index) => {
      const values = selectedRows.map((row) => String((row.cells as Record<string, unknown>)[column.key] ?? ""));
      const width = Math.max(column.name.length, ...values.map((value) => value.length), 12);
      worksheet.getColumn(index + 1).width = Math.min(width + 3, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeNumber = proforma.proformaNumber.replace(/[^a-z0-9-_]+/gi, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="proforma-${safeNumber}.xlsx"`);
    res.send(Buffer.from(buffer));
  })
);

export default router;
