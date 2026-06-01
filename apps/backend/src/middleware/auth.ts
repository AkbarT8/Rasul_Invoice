import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { HttpError } from "../lib/http.js";
import { verifyAccessToken } from "../lib/tokens.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : undefined;
  const token = bearer ?? req.cookies?.access_token;

  if (!token) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired session"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Insufficient permissions"));
    }

    return next();
  };
}
