import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = z.object({ q: z.string().trim().min(1).max(120) }).parse(req.query);
    const userFilter =
      req.user?.role === Role.USER ? { client: { assignments: { some: { userId: req.user.id } } } } : {};
    const clientFilter = req.user?.role === Role.USER ? { assignments: { some: { userId: req.user.id } } } : {};

    const [clients, proformas, rows] = await prisma.$transaction([
      prisma.client.findMany({
        where: {
          ...clientFilter,
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { companyName: { contains: query.q, mode: "insensitive" } },
            { notes: { contains: query.q, mode: "insensitive" } }
          ]
        },
        take: 8
      }),
      prisma.proforma.findMany({
        where: {
          ...userFilter,
          OR: [
            { proformaNumber: { contains: query.q, mode: "insensitive" } },
            { notes: { contains: query.q, mode: "insensitive" } }
          ]
        },
        include: { client: { select: { id: true, name: true, companyName: true } } },
        take: 8
      }),
      prisma.articleRow.findMany({
        where: {
          proforma: userFilter,
          cells: {
            path: [],
            string_contains: query.q
          }
        },
        include: {
          proforma: { include: { client: { select: { id: true, name: true, companyName: true } } } }
        },
        take: 8
      })
    ]);

    res.json({ clients, proformas, rows });
  })
);

export default router;
