import { Router } from "express";
import { ProformaStatus, Role } from "@prisma/client";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const clientWhere = req.user?.role === Role.USER ? { assignments: { some: { userId: req.user.id } } } : {};
    const proformaWhere =
      req.user?.role === Role.USER ? { client: { assignments: { some: { userId: req.user.id } } } } : {};

    const [totalClients, totalProformas, totalArticles, pendingOrders, completedOrders, recentProformas] =
      await prisma.$transaction([
        prisma.client.count({ where: clientWhere }),
        prisma.proforma.count({ where: proformaWhere }),
        prisma.articleRow.count({ where: { proforma: proformaWhere } }),
        prisma.proforma.count({ where: { ...proformaWhere, status: { in: [ProformaStatus.PENDING, ProformaStatus.PROCESSING] } } }),
        prisma.proforma.count({ where: { ...proformaWhere, status: ProformaStatus.COMPLETED } }),
        prisma.proforma.findMany({
          where: proformaWhere,
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { client: { select: { id: true, name: true, companyName: true } } }
        })
      ]);

    res.json({
      totalClients,
      totalProformas,
      totalArticles,
      pendingOrders,
      completedOrders,
      recentProformas
    });
  })
);

export default router;
