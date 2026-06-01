import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env.js";
import { errorHandler } from "./lib/http.js";
import { apiRateLimiter, csrfProtection } from "./middleware/security.js";
import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/client.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import exportRoutes from "./modules/exports/export.routes.js";
import fileRoutes from "./modules/files/file.routes.js";
import proformaRoutes from "./modules/proformas/proforma.routes.js";
import searchRoutes from "./modules/search/search.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: isProduction
    })
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    })
  );
  app.use(compression());
  app.use(morgan(isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(apiRateLimiter);
  app.use(csrfProtection);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/proformas", proformaRoutes);
  app.use("/api/exports", exportRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/search", searchRoutes);

  app.use(errorHandler);

  return app;
}
