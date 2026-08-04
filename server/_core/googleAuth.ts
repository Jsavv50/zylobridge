/**
 * Direct Google OAuth 2.0 integration — production-safe for Vercel serverless.
 *
 * Routes registered:
 *   GET /api/auth/google           — redirect to Google consent screen
 *   GET /api/auth/google/callback  — exchange code, upsert user, set session cookie
 *
 * State management:
 *   Uses a stateless HMAC-signed state token (nonce.returnPath.timestamp.sig)
 *   instead of an in-memory Map. This is safe across Vercel serverless cold starts
 *   and multi-instance deployments because no server-side state is required.
 *
 * Session:
 *   1. Creates a JWT session cookie via the existing Manus session infrastructure.
 *   2. Provisions the user in Supabase Auth (best-effort, non-blocking).
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, getBaseUrl } from "./env";
import { sdk } from "./sdk";
import { getSupabaseAdmin } from "./supabase";

// ── Stateless signed state helpers ────────────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signState(payload: string): string {
  const secret = ENV.cookieSecret || "zylobridge-oauth-state-secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function encodeState(returnPath: string): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now().toString();
  const safe = encodeURIComponent(returnPath || "/");
  const payload = `${nonce}.${safe}.${ts}`;
  const sig = signState(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function decodeState(state: string): { returnPath: string } | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length < 4) return null;
    const sig = parts[parts.length - 1];
    const payload = parts.slice(0, -1).join(".");
    const expected = signState(payload);
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
    const ts = parseInt(parts[parts.length - 2], 10);
    if (Date.now() - ts > STATE_TTL_MS) return null;
    const returnPath = decodeURIComponent(parts[1]);
    return { returnPath };
  } catch {
    return null;
  }
}

// ── Google API helpers ────────────────────────────────────────────────────────

function buildGoogleAuthUrl(state: string): string {
  const callbackUrl = `${getBaseUrl()}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
}> {
  const callbackUrl = `${getBaseUrl()}/api/auth/google/callback`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[GoogleAuth] Token exchange failed: ${body}`);
  }
  return res.json();
}

async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("[GoogleAuth] Failed to fetch user info from Google");
  return res.json();
}

// ── Supabase user provisioning ────────────────────────────────────────────────

async function syncUserToSupabase(googleUser: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<void> {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) return;

  try {
    const supabase = getSupabaseAdmin();

    // Try to fetch the user by email first
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u) => u.email === googleUser.email);

    if (existing) {
      // Update metadata to keep it fresh
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          name: googleUser.name,
          picture: googleUser.picture,
          provider: "google",
          google_sub: googleUser.sub,
        },
      });
      console.log(`[GoogleAuth] Supabase user updated for ${googleUser.email}`);
    } else {
      // Create the user with email already confirmed
      const { error } = await supabase.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: {
          name: googleUser.name,
          picture: googleUser.picture,
          provider: "google",
          google_sub: googleUser.sub,
        },
      });
      if (error) {
        console.error(`[GoogleAuth] Supabase createUser error: ${error.message}`);
      } else {
        console.log(`[GoogleAuth] Supabase user created for ${googleUser.email}`);
      }
    }
  } catch (err) {
    // Non-fatal — log and continue; Supabase is a secondary store
    console.error("[GoogleAuth] Supabase sync failed (non-fatal):", err);
  }
}

// ── Express route registration ────────────────────────────────────────────────

export function registerGoogleAuthRoutes(app: Express) {
  // ── Step 1: Initiate Google OAuth ──────────────────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(503).json({
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      });
      return;
    }

    const returnPath =
      typeof req.query.returnPath === "string" ? req.query.returnPath : "/";
    const state = encodeState(returnPath);
    const authUrl = buildGoogleAuthUrl(state);
    console.log(`[GoogleAuth] Redirecting to Google consent screen`);
    res.redirect(302, authUrl);
  });

  // ── Step 2: Handle Google callback ────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;
    const base = getBaseUrl();

    if (error) {
      console.warn(`[GoogleAuth] User denied access: ${error}`);
      res.redirect(302, `${base}/sign-in?error=google_denied`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "Missing code or state parameter" });
      return;
    }

    const decoded = decodeState(state);
    if (!decoded) {
      console.warn("[GoogleAuth] Invalid or expired state param");
      res.redirect(302, `${base}/sign-in?error=invalid_state`);
      return;
    }

    try {
      // Exchange code for tokens and fetch user info
      const tokens = await exchangeCodeForTokens(code);
      const googleUser = await fetchGoogleUserInfo(tokens.access_token);

      if (!googleUser.email_verified) {
        res.redirect(302, `${base}/sign-in?error=email_not_verified`);
        return;
      }

      // Derive a stable openId from the Google subject identifier
      const openId = `google_${googleUser.sub}`;

      // Upsert user in local TiDB database
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Sync user to Supabase Auth (best-effort, non-blocking)
      await syncUserToSupabase(googleUser);

      // Create JWT session cookie via the existing Manus session infrastructure
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      const returnPath = decoded.returnPath || "/";
      const redirectTo = `${base}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;
      console.log(
        `[GoogleAuth] Sign-in successful for ${googleUser.email} — redirecting to ${redirectTo}`
      );
      res.redirect(302, redirectTo);
    } catch (err) {
      console.error("[GoogleAuth] Callback error:", err);
      res.redirect(302, `${base}/sign-in?error=google_failed`);
    }
  });
}
