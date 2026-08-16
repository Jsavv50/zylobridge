/**
 * Direct Google OAuth 2.0 integration — production-safe for Railway.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, getBaseUrl, getFrontendUrl } from "./env";
import { sdk } from "./sdk";
import { getSupabaseAdmin } from "./supabase";

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

function getCallbackUrl(): string {
  const base = getBaseUrl();
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    throw new Error(`[GoogleAuth] Invalid base URL "${base}". Set APP_BASE_URL or APP_URL.`);
  }
  return `${base}/api/auth/google/callback`;
}

function buildGoogleAuthUrl(state: string): string {
  const callbackUrl = getCallbackUrl();
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

async function exchangeCodeForTokens(code: string, oauthRequestId: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
}> {
  const callbackUrl = getCallbackUrl();
  console.log(`[GoogleAuth] [${oauthRequestId}] Exchanging code for tokens...`);
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
    console.error(`[GoogleAuth] [${oauthRequestId}] Token exchange failed (${res.status}): ${body}`);
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string }>;
}

async function fetchGoogleUserInfo(accessToken: string, oauthRequestId: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[GoogleAuth] [${oauthRequestId}] Failed to fetch user info (${res.status}): ${body}`);
    throw new Error(`Failed to fetch user info from Google (${res.status})`);
  }
  return res.json() as Promise<{
    sub: string;
    email: string;
    name: string;
    picture?: string;
    email_verified: boolean;
  }>;
}

async function syncUserToSupabase(googleUser: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<void> {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) return;
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u) => u.email === googleUser.email);
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          name: googleUser.name,
          picture: googleUser.picture,
          provider: "google",
          google_sub: googleUser.sub,
        },
      });
    } else {
      await supabase.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: {
          name: googleUser.name,
          picture: googleUser.picture,
          provider: "google",
          google_sub: googleUser.sub,
        },
      });
    }
  } catch (err) {
    console.error("[GoogleAuth] Supabase sync failed (non-fatal):", err);
  }
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const oauthRequestId = crypto.randomBytes(4).toString("hex").toUpperCase();
    console.log(`[GoogleAuth] [${oauthRequestId}] OAuth initiation requested`);

    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(503).json({ error: "Google OAuth is not configured." });
      return;
    }

    const returnPath = typeof req.query.returnPath === "string" ? req.query.returnPath : "/";
    const state = encodeState(returnPath);

    try {
      const authUrl = buildGoogleAuthUrl(state);
      console.log(`[GoogleAuth] [${oauthRequestId}] Redirecting to Google consent screen`);
      res.redirect(302, authUrl);
    } catch (err) {
      console.error(`[GoogleAuth] [${oauthRequestId}] Failed to build auth URL:`, err);
      res.status(503).json({ error: "Google OAuth misconfigured." });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const oauthRequestId = crypto.randomBytes(4).toString("hex").toUpperCase();
    const startTime = Date.now();
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;
    const frontend = getFrontendUrl();

    console.log(`[GoogleAuth] [${oauthRequestId}] Callback received. Has code: ${!!code}, has state: ${!!state}, error: ${error || "none"}`);

    if (error) {
      console.warn(`[GoogleAuth] [${oauthRequestId}] User denied access: ${error}`);
      res.redirect(302, `${frontend}/sign-in?error=google_denied`);
      return;
    }

    if (!code || !state) {
      console.warn(`[GoogleAuth] [${oauthRequestId}] Missing code or state`);
      res.redirect(302, `${frontend}/sign-in?error=google_missing_params`);
      return;
    }

    const decoded = decodeState(state);
    if (!decoded) {
      console.warn(`[GoogleAuth] [${oauthRequestId}] Invalid or expired state param`);
      res.redirect(302, `${frontend}/sign-in?error=invalid_state`);
      return;
    }

    try {
      console.log(`[GoogleAuth] [${oauthRequestId}] State validated. Exchanging code for tokens...`);
      const tokens = await exchangeCodeForTokens(code, oauthRequestId);
      const googleUser = await fetchGoogleUserInfo(tokens.access_token, oauthRequestId);

      if (!googleUser.email_verified) {
        console.warn(`[GoogleAuth] [${oauthRequestId}] Unverified email: ${googleUser.email}`);
        res.redirect(302, `${frontend}/sign-in?error=email_not_verified`);
        return;
      }

      const openId = `google_${googleUser.sub}`;
      console.log(`[GoogleAuth] [${oauthRequestId}] User upsert starting for email: ${googleUser.email}`);
      
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });
      console.log(`[GoogleAuth] [${oauthRequestId}] User upsert completed`);

      // Resolve user record to verify ID and role
      const dbUser = await db.getUserByEmail(googleUser.email);
      console.log(`[GoogleAuth] [${oauthRequestId}] Resolved user ID: ${dbUser?.id}, role: ${dbUser?.role}`);

      // Non-blocking background Supabase sync
      syncUserToSupabase(googleUser).catch((e) => console.error(`[GoogleAuth] [${oauthRequestId}] Background Supabase sync error:`, e));

      console.log(`[GoogleAuth] [${oauthRequestId}] Starting session creation...`);
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log(`[GoogleAuth] [${oauthRequestId}] Session creation completed`);

      const cookieOptions = getSessionCookieOptions(req);
      console.log(`[GoogleAuth] [${oauthRequestId}] Setting session cookie (${COOKIE_NAME}) with domain: ${cookieOptions.domain || "default"}, secure: ${cookieOptions.secure}, httpOnly: ${cookieOptions.httpOnly}`);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log(`[GoogleAuth] [${oauthRequestId}] Session cookie set successfully`);

      const returnPath = decoded.returnPath || "/";
      const redirectTo = `${frontend}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;
      const duration = Date.now() - startTime;
      console.log(`[GoogleAuth] [${oauthRequestId}] Callback completed successfully in ${duration}ms — redirecting to ${redirectTo}`);
      
      res.redirect(302, redirectTo);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[GoogleAuth] [${oauthRequestId}] Callback failed after ${duration}ms with error:`, err);
      const errMsg = err instanceof Error ? encodeURIComponent(err.message.slice(0, 120)) : "unknown";
      res.redirect(302, `${frontend}/sign-in?error=google_failed&details=${errMsg}`);
    }
  });
}
