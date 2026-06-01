import { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";

export async function ensureClientAccess(user: Express.Request["user"], clientId: string) {
  if (!user) throw new HttpError(401, "Authentication required");
  if (user.role === Role.ADMIN) return;

  const assignment = await prisma.clientAssignment.findUnique({
    where: { userId_clientId: { userId: user.id, clientId } },
    select: { id: true }
  });

  if (!assignment) {
    throw new HttpError(403, "Client is not assigned to this user");
  }
}

export async function ensureProformaAccess(user: Express.Request["user"], proformaId: string) {
  const proforma = await prisma.proforma.findUnique({
    where: { id: proformaId },
    select: { clientId: true }
  });

  if (!proforma) {
    throw new HttpError(404, "Proforma not found");
  }

  await ensureClientAccess(user, proforma.clientId);
  return proforma;
}
