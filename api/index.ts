/**
 * api/index.ts — Vercel Serverless Function entry point
 *
 * This file is the sole entry point for all /api/* routes on Vercel.
 * It imports the pre-configured Express application (middleware, tRPC,
 * OAuth, Google Auth, storage proxy, Socket.io excluded for serverless)
 * and exports it as a Vercel-compatible handler.
 *
 * IMPORTANT: Do NOT modify application logic here. All routing, auth,
 * tRPC procedures, and database access live in server/.
 */

import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerGoogleAuthRoutes } from "../server/_core/googleAuth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import {
  helmetMiddleware,
  generalRateLimit,
  authRateLimit,
  sanitizeInputs,
} from "../server/middleware/security";

const app = express();

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(sanitizeInputs);

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use("/api/oauth", authRateLimit);
app.use("/api/auth", authRateLimit);
app.use("/api/trpc", generalRateLimit);

// ── Platform routes ───────────────────────────────────────────────────────
registerStorageProxy(app);
registerOAuthRoutes(app);
registerGoogleAuthRoutes(app);

// ── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── tRPC API ──────────────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
