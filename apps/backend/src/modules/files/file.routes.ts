import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { AttachmentOwnerType } from "@prisma/client";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { ensureClientAccess, ensureProformaAccess } from "../../lib/access.js";

const router = Router();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png"
]);

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.UPLOAD_DIR),
  filename: (_req, file, callback) => callback(null, `${uuid()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new HttpError(422, "Unsupported file type"));
    }
    return callback(null, true);
  }
});

router.use(requireAuth);

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        ownerType: z.nativeEnum(AttachmentOwnerType),
        ownerId: z.string().uuid()
      })
      .parse(req.body);

    if (!req.file) throw new HttpError(422, "File is required");

    if (body.ownerType === AttachmentOwnerType.CLIENT) {
      await ensureClientAccess(req.user, body.ownerId);
    } else {
      await ensureProformaAccess(req.user, body.ownerId);
    }

    const attachment = await prisma.fileAttachment.create({
      data: {
        ownerType: body.ownerType,
        clientId: body.ownerType === AttachmentOwnerType.CLIENT ? body.ownerId : undefined,
        proformaId: body.ownerType === AttachmentOwnerType.PROFORMA ? body.ownerId : undefined,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: req.file.path,
        uploadedBy: req.user!.id
      }
    });

    res.status(201).json({ attachment });
  })
);

router.get(
  "/:attachmentId/download",
  asyncHandler(async (req, res) => {
    const attachment = await prisma.fileAttachment.findUnique({ where: { id: (req.params.attachmentId as string) } });
    if (!attachment) throw new HttpError(404, "Attachment not found");

    if (attachment.ownerType === AttachmentOwnerType.CLIENT && attachment.clientId) {
      await ensureClientAccess(req.user, attachment.clientId);
    }
    if (attachment.ownerType === AttachmentOwnerType.PROFORMA && attachment.proformaId) {
      await ensureProformaAccess(req.user, attachment.proformaId);
    }

    res.download(attachment.storagePath, attachment.fileName);
  })
);

router.delete(
  "/:attachmentId",
  asyncHandler(async (req, res) => {
    const attachment = await prisma.fileAttachment.findUnique({ where: { id: (req.params.attachmentId as string) } });
    if (!attachment) throw new HttpError(404, "Attachment not found");

    if (attachment.ownerType === AttachmentOwnerType.CLIENT && attachment.clientId) {
      await ensureClientAccess(req.user, attachment.clientId);
    }
    if (attachment.ownerType === AttachmentOwnerType.PROFORMA && attachment.proformaId) {
      await ensureProformaAccess(req.user, attachment.proformaId);
    }

    await prisma.fileAttachment.delete({ where: { id: attachment.id } });
    fs.promises.unlink(attachment.storagePath).catch(() => undefined);
    res.status(204).send();
  })
);

export default router;
