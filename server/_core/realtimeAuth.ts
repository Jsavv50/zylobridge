/**
 * Supabase Realtime Authorization Bridge
 *
 * Generates short-lived Supabase-compatible Realtime JWTs signed with SUPABASE_JWT_SECRET.
 * Authenticates requests exclusively via the existing Zylobridge HttpOnly session cookie
 * (via sdk.authenticateRequest), ensuring user identity is derived entirely from the session.
 */
import type { Express, Request, Response } from "express";
import { SignJWT } from "jose";
import { ENV } from "./env";
import { sdk } from "./sdk";

const REALTIME_TOKEN_EXPIRATION_SECONDS = 1800; // 30 minutes

/**
 * Validate that SUPABASE_JWT_SECRET is configured at startup.
 * Fails clearly if missing without printing any secret value.
 */
export function validateRealtimeConfig() {
  if (!ENV.supabaseJwtSecret) {
    console.warn("[RealtimeAuth] WARNING: SUPABASE_JWT_SECRET is not configured. Realtime authorization tokens cannot be generated.");
  } else {
    console.log("[RealtimeAuth] Initialized successfully with SUPABASE_JWT_SECRET configured.");
  }
}

/**
 * Generate a short-lived Supabase Realtime authorization JWT for a given user ID.
 * Signed with SUPABASE_JWT_SECRET using HS256.
 */
async function generateRealtimeToken(userId: number): Promise<string> {
  if (!ENV.supabaseJwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET is not configured");
  }

  const secretKey = new TextEncoder().encode(ENV.supabaseJwtSecret);
  const issuedAt = Math.floor(Date.now() / 1000);
  const expirationSeconds = issuedAt + REALTIME_TOKEN_EXPIRATION_SECONDS;

  return new SignJWT({
    sub: String(userId),
    role: "authenticated",
    user_id: userId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/**
 * Register GET /api/realtime/token
 * Authenticated via existing Zylobridge session cookie (authenticateRequest).
 */
export function registerRealtimeAuthRoutes(app: Express) {
  validateRealtimeConfig();

  app.get("/api/realtime/token", async (req: Request, res: Response) => {
    if (!ENV.supabaseJwtSecret) {
      res.status(503).json({ error: "SUPABASE_JWT_SECRET is not configured" });
      return;
    }

    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || !user.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      console.log(`[RealtimeAuth] Token requested`);
      console.log(`[RealtimeAuth] User authenticated: ${user.id}`);

      const token = await generateRealtimeToken(user.id);

      console.log(`[RealtimeAuth] Realtime token generated`);

      res.json({
        token,
        expiresIn: REALTIME_TOKEN_EXPIRATION_SECONDS,
      });
    } catch (error) {
      console.warn("[RealtimeAuth] Authentication failed for realtime token request:", String(error));
      res.status(401).json({ error: "Unauthorized" });
    }
  });
}
