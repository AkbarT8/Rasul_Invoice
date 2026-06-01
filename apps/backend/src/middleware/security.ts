import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { HttpError } from "../lib/http.js";
import { isProduction } from "../config/env.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const csrfExemptPaths = new Set(["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"]);

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export function setCsrfCookie(_req: Request, res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrf_token", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: isProduction,
    path: "/"
  });
  return token;
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!unsafeMethods.has(req.method) || csrfExemptPaths.has(req.path)) {
    return next();
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "Invalid CSRF token"));
  }

  return next();
}
