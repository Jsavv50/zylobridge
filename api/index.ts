/**
 * Vercel Serverless Function entry point.
 *
 * This file wraps the Express application for Vercel's Node.js runtime.
 * All /api/* requests are routed here by vercel.json.
 *
 * NOTE: Socket.io real-time features require a persistent server and will
 * not work in Vercel's serverless environment. For full functionality
 * (real-time messaging, persistent connections), use Manus hosting or a
 * dedicated Node.js server (Railway, Render, Fly.io).
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/core/oauth";
import { registerGoogleAuthRoutes } from "../server/core/googleAuth";
import { registerStorageProxy } from "../server/core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/core/context";
import {
  helmetMiddleware,
  generalRateLimit,
  authRateLimit,
  sanitizeInputs,
} from "../server/middleware/security";

const app = express();

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(sanitizeInputs);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api/trpc/auth", authRateLimit);
app.use("/api/auth", authRateLimit);
app.use("/api/", generalRateLimit);

// ── OAuth routes ──────────────────────────────────────────────────────────────
registerOAuthRoutes(app);
registerGoogleAuthRoutes(app);

// ── Storage proxy ─────────────────────────────────────────────────────────────
registerStorageProxy(app);

// ── tRPC handler ─────────────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
