import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { env, isProduction } from "../../config/env.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/tokens.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { authRateLimiter, setCsrfCookie } from "../../middleware/security.js";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: isProduction,
  path: "/",
  domain: env.COOKIE_DOMAIN || undefined
};

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  remember: z.boolean().default(false)
});

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(200),
  role: z.nativeEnum(Role).default(Role.USER)
});

function sanitizeUser(user: { id: string; name: string; email: string; role: Role; isActive: boolean }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

router.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid email or password");
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const expiresAt = new Date(Date.now() + (body.remember ? 30 : 1) * 24 * 60 * 60 * 1000);
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: "pending",
        remember: body.remember,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip
      }
    });
    const refreshToken = signRefreshToken(session.id, user.id);
    await prisma.userSession.update({
      where: { id: session.id },
      data: { tokenHash: hashToken(refreshToken) }
    });

    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: expiresAt.getTime() - Date.now()
    });
    setCsrfCookie(req, res);

    res.json({ user: sanitizeUser(user) });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new HttpError(401, "Refresh token required");

    const payload = verifyRefreshToken(refreshToken);
    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true }
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.tokenHash !== hashToken(refreshToken) ||
      !session.user.isActive
    ) {
      throw new HttpError(401, "Invalid refresh session");
    }

    const accessToken = signAccessToken({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    setCsrfCookie(req, res);
    res.json({ user: sanitizeUser(session.user) });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.userSession.updateMany({
          where: { id: payload.sessionId },
          data: { revokedAt: new Date() }
        });
      } catch {
        // Logout should clear local state even if the refresh token is stale.
      }
    }

    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("csrf_token", { path: "/" });
    res.status(204).send();
  })
);

router.get("/csrf", (_req, res) => {
  const token = setCsrfCookie(_req, res);
  res.json({ token });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: sanitizeUser(user) });
  })
);

router.post(
  "/users",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash, role: body.role }
    });
    res.status(201).json({ user: sanitizeUser(user) });
  })
);

export default router;
