import { Router } from "express";
import { Prisma, ProformaStatus, Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { getPagination } from "../../lib/validation.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ensureClientAccess, ensureProformaAccess } from "../../lib/access.js";

const router = Router();

const proformaSchema = z.object({
  clientId: z.string().uuid(),
  proformaNumber: z.string().min(1).max(80),
  date: z.coerce.date(),
  status: z.nativeEnum(ProformaStatus).default(ProformaStatus.DRAFT),
  currency: z.string().min(3).max(8).default("USD"),
  notes: z.string().max(20000).optional()
});

const updateProformaSchema = proformaSchema.omit({ clientId: true }).partial();

const columnSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["text", "number", "date", "currency", "select", "richText"]).default("text"),
  hidden: z.boolean().default(false)
});

const updateColumnSchema = columnSchema.partial().extend({
  position: z.number().int().min(0).optional()
});

const rowSchema = z.object({
  position: z.number().int().min(0).optional(),
  cells: z.record(z.string(), z.unknown()).default({}),
  colors: z.record(z.string(), z.string()).default({})
});

const updateRowSchema = rowSchema.partial();

const bulkSchema = z.object({
  rowIds: z.array(z.string().uuid()).min(1),
  action: z.enum(["delete", "duplicate", "changeColor"]),
  color: z.string().optional(),
  columnKey: z.string().optional()
});

function slugifyColumnKey(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  return `${base || "column"}_${Math.random().toString(36).slice(2, 7)}`;
}

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take, search, sortBy, sortOrder } = getPagination(req.query);
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
    if (clientId) await ensureClientAccess(req.user, clientId);

    const allowedSorts = new Set(["proformaNumber", "date", "status", "updatedAt", "createdAt"]);
    const where: Prisma.ProformaWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(req.user?.role === Role.USER ? { client: { assignments: { some: { userId: req.user.id } } } } : {}),
      ...(search
        ? {
            OR: [
              { proformaNumber: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
              { client: { name: { contains: search, mode: "insensitive" } } },
              { client: { companyName: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };
    const orderBy = allowedSorts.has(sortBy ?? "") ? { [sortBy!]: sortOrder } : { updatedAt: "desc" as const };

    const [items, total] = await prisma.$transaction([
      prisma.proforma.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          _count: { select: { rows: true, columns: true, attachments: true } }
        }
      }),
      prisma.proforma.count({ where })
    ]);

    res.json({ items, page, pageSize, total });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = proformaSchema.parse(req.body);
    await ensureClientAccess(req.user, body.clientId);
    const proforma = await prisma.proforma.create({
      data: {
        clientId: body.clientId,
        proformaNumber: body.proformaNumber,
        date: body.date,
        status: body.status,
        currency: body.currency.toUpperCase(),
        notes: body.notes,
        createdById: req.user!.id
      },
      include: { columns: true, rows: true, client: true }
    });
    res.status(201).json({ proforma });
  })
);

router.get(
  "/:proformaId",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const proforma = await prisma.proforma.findUnique({
      where: { id: req.params.proformaId },
      include: {
        client: true,
        attachments: true,
        columns: { orderBy: { position: "asc" } },
        rows: { orderBy: { position: "asc" } }
      }
    });
    if (!proforma) throw new HttpError(404, "Proforma not found");
    res.json({ proforma });
  })
);

router.patch(
  "/:proformaId",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = updateProformaSchema.parse(req.body);
    const proforma = await prisma.proforma.update({
      where: { id: req.params.proformaId },
      data: {
        proformaNumber: body.proformaNumber,
        date: body.date,
        status: body.status,
        currency: body.currency?.toUpperCase(),
        notes: body.notes
      }
    });
    res.json({ proforma });
  })
);

router.delete(
  "/:proformaId",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.proforma.delete({ where: { id: req.params.proformaId } });
    res.status(204).send();
  })
);

router.post(
  "/:proformaId/columns",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = columnSchema.parse(req.body);
    const lastColumn = await prisma.customColumn.findFirst({
      where: { proformaId: req.params.proformaId },
      orderBy: { position: "desc" }
    });
    const column = await prisma.customColumn.create({
      data: {
        proformaId: req.params.proformaId,
        key: slugifyColumnKey(body.name),
        name: body.name,
        type: body.type,
        hidden: body.hidden,
        position: (lastColumn?.position ?? -1) + 1
      }
    });
    res.status(201).json({ column });
  })
);

router.patch(
  "/:proformaId/columns/:columnId",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = updateColumnSchema.parse(req.body);
    const column = await prisma.customColumn.update({
      where: { id: req.params.columnId, proformaId: req.params.proformaId },
      data: body
    });
    res.json({ column });
  })
);

router.post(
  "/:proformaId/columns/reorder",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = z.object({ columnIds: z.array(z.string().uuid()).min(1) }).parse(req.body);
    await prisma.$transaction(
      body.columnIds.map((id, position) =>
        prisma.customColumn.update({
          where: { id, proformaId: req.params.proformaId },
          data: { position }
        })
      )
    );
    const columns = await prisma.customColumn.findMany({
      where: { proformaId: req.params.proformaId },
      orderBy: { position: "asc" }
    });
    res.json({ columns });
  })
);

router.delete(
  "/:proformaId/columns/:columnId",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    await prisma.customColumn.delete({ where: { id: req.params.columnId, proformaId: req.params.proformaId } });
    res.status(204).send();
  })
);

router.post(
  "/:proformaId/rows",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = rowSchema.parse(req.body);
    const lastRow = await prisma.articleRow.findFirst({
      where: { proformaId: req.params.proformaId },
      orderBy: { position: "desc" }
    });
    const row = await prisma.articleRow.create({
      data: {
        proformaId: req.params.proformaId,
        position: body.position ?? (lastRow?.position ?? -1) + 1,
        cells: body.cells as Prisma.InputJsonValue,
        colors: body.colors as Prisma.InputJsonValue
      }
    });
    res.status(201).json({ row });
  })
);

router.patch(
  "/:proformaId/rows/:rowId",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = updateRowSchema.parse(req.body);
    const row = await prisma.articleRow.update({
      where: { id: req.params.rowId, proformaId: req.params.proformaId },
      data: {
        position: body.position,
        cells: body.cells as Prisma.InputJsonValue | undefined,
        colors: body.colors as Prisma.InputJsonValue | undefined
      }
    });
    res.json({ row });
  })
);

router.post(
  "/:proformaId/rows/bulk",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    const body = bulkSchema.parse(req.body);

    if (body.action === "delete") {
      await prisma.articleRow.deleteMany({
        where: { id: { in: body.rowIds }, proformaId: req.params.proformaId }
      });
      return res.status(204).send();
    }

    const rows = await prisma.articleRow.findMany({
      where: { id: { in: body.rowIds }, proformaId: req.params.proformaId },
      orderBy: { position: "asc" }
    });

    if (body.action === "duplicate") {
      const lastRow = await prisma.articleRow.findFirst({
        where: { proformaId: req.params.proformaId },
        orderBy: { position: "desc" }
      });
      const startPosition = (lastRow?.position ?? -1) + 1;
      const created = await prisma.$transaction(
        rows.map((row, index) =>
          prisma.articleRow.create({
            data: {
              proformaId: req.params.proformaId,
              position: startPosition + index,
              cells: row.cells as Prisma.InputJsonValue,
              colors: row.colors as Prisma.InputJsonValue
            }
          })
        )
      );
      return res.json({ rows: created });
    }

    if (body.action === "changeColor") {
      if (!body.columnKey || !body.color) {
        throw new HttpError(422, "columnKey and color are required");
      }
      const updated = await prisma.$transaction(
        rows.map((row) => {
          const colors = { ...(row.colors as Record<string, string>), [body.columnKey!]: body.color! };
          return prisma.articleRow.update({
            where: { id: row.id },
            data: { colors: colors as Prisma.InputJsonValue }
          });
        })
      );
      return res.json({ rows: updated });
    }

    throw new HttpError(400, "Unsupported bulk action");
  })
);

router.delete(
  "/:proformaId/rows/:rowId",
  asyncHandler(async (req, res) => {
    await ensureProformaAccess(req.user, req.params.proformaId);
    await prisma.articleRow.delete({ where: { id: req.params.rowId, proformaId: req.params.proformaId } });
    res.status(204).send();
  })
);

export default router;
