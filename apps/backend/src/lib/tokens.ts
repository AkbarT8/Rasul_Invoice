import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

export type JwtUser = {
  id: string;
  email: string;
  role: Role;
};

export function signAccessToken(user: JwtUser) {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(user, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(sessionId: string, userId: string) {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign({ sessionId, userId }, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUser;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sessionId: string; userId: string };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}
