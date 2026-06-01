import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { getPagination } from "../../lib/validation.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ensureClientAccess } from "../../lib/access.js";

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1).max(180),
  companyName: z.string().min(1).max(180),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(60).optional(),
  country: z.string().max(120).optional(),
  notes: z.string().max(10000).optional(),
  assignedUserIds: z.array(z.string().uuid()).optional()
});

const updateClientSchema = clientSchema.partial();

function clientWhere(user: Express.Request["user"], search?: string) {
  const searchWhere = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { country: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : {};

  if (user?.role === Role.ADMIN) return searchWhere;

  return {
    ...searchWhere,
    assignments: { some: { userId: user?.id } }
  };
}

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take, search, sortBy, sortOrder } = getPagination(req.query);
    const allowedSorts = new Set(["name", "companyName", "country", "createdAt", "updatedAt"]);
    const orderBy = allowedSorts.has(sortBy ?? "") ? { [sortBy!]: sortOrder } : { createdAt: "desc" as const };
    const where = clientWhere(req.user, search);

    const [items, total] = await prisma.$transaction([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: { select: { proformas: true } },
          assignments: { include: { user: { select: { id: true, name: true, email: true } } } }
        }
      }),
      prisma.client.count({ where })
    ]);

    res.json({ items, page, pageSize, total });
  })
);

router.post(
  "/",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: {
        name: body.name,
        companyName: body.companyName,
        email: body.email || null,
        phone: body.phone,
        country: body.country,
        notes: body.notes,
        createdById: req.user!.id,
        assignments: body.assignedUserIds?.length
          ? {
              create: body.assignedUserIds.map((userId) => ({ userId }))
            }
          : undefined
      },
      include: {
        _count: { select: { proformas: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });

    res.status(201).json({ client });
  })
);

router.get(
  "/:clientId",
  asyncHandler(async (req, res) => {
    await ensureClientAccess(req.user, (req.params.clientId as string));
    const client = await prisma.client.findUnique({
      where: { id: (req.params.clientId as string) },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        attachments: true,
        proformas: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { rows: true, columns: true, attachments: true } }
          }
        }
      }
    });
    if (!client) throw new HttpError(404, "Client not found");
    res.json({ client });
  })
);

router.patch(
  "/:clientId",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = updateClientSchema.parse(req.body);
    const client = await prisma.client.update({
      where: { id: (req.params.clientId as string) },
      data: {
        name: body.name,
        companyName: body.companyName,
        email: body.email === "" ? null : body.email,
        phone: body.phone,
        country: body.country,
        notes: body.notes,
        assignments: body.assignedUserIds
          ? {
              deleteMany: {},
              create: body.assignedUserIds.map((userId) => ({ userId }))
            }
          : undefined
      },
      include: {
        _count: { select: { proformas: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
    res.json({ client });
  })
);

router.delete(
  "/:clientId",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.client.delete({ where: { id: (req.params.clientId as string) } });
    res.status(204).send();
  })
);

export default router;
