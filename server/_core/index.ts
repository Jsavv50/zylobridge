import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerRealtimeAuthRoutes } from "./realtimeAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { sdk } from "./sdk";
import { createContext } from "./context";
import { setupVite } from "./vite";
import { registerSocketIO } from "../socket";
import {
  helmetMiddleware,
  generalRateLimit,
  authRateLimit,
  sanitizeInputs,
} from "../middleware/security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Trust proxy ───────────────────────────────────────────────────────────
  // Railway terminates TLS at its load balancer and forwards requests via HTTP
  // with X-Forwarded-Proto: https. Without trust proxy, req.protocol is "http"
  // and isSecureRequest() returns false, causing SameSite=None cookies to be
  // set with Secure=false — which browsers reject for cross-site requests.
  app.set("trust proxy", 1);

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Allow the Vercel frontend origin to make cross-origin API requests.
  // FRONTEND_URL must be set in Railway environment variables, e.g.:
  //   https://zylobridge.vercel.app
  // Multiple origins can be comma-separated: https://a.vercel.app,https://b.com
  // Always allow the production domain. FRONTEND_URL can add extra origins
  // (e.g. preview deployments) as a comma-separated list.
  const allowedOrigins = [
    "https://zylobridge.com",
    "https://www.zylobridge.com",
    ...(process.env.FRONTEND_URL ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin requests (no Origin header) and local development
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.length === 0 ||
          allowedOrigins.includes(origin) ||
          origin.startsWith("http://localhost")
        ) {
          return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  // ── Security middleware ──────────────────────────────────────────────────
  app.use(helmetMiddleware);
  app.use(sanitizeInputs);

  // ── Body parsers ─────────────────────────────────────────────────────────
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
  registerRealtimeAuthRoutes(app);

  // ── Root endpoint (API diagnostics) ──────────────────────────────────────
  app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "Zylobridge API" });
  });

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

  // ── Socket.io real-time messaging ──────────────────────────────────────────
  registerSocketIO(server);

  // ── Scheduled Cron: Audit Log Retention (30 Days) ──────────────────────────
  app.post("/api/scheduled/cleanupAuditLogs", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "Unauthorized cron execution" });
      }
      const { deleteOldAuditLogs } = await import("../db");
      const result = await deleteOldAuditLogs(30);
      return res.json({ ok: true, cleanedAt: new Date().toISOString(), result });
    } catch (err: any) {
      console.error("[Cron] cleanupAuditLogs failed:", err);
      return res.status(500).json({
        error: err.message,
        stack: err.stack,
        context: { url: req.originalUrl },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── Local development — Vite dev server (not used on Railway) ─────────────
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
