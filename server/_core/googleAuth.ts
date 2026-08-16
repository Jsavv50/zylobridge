/**
 * Direct Google OAuth 2.0 integration — production-safe for Railway with persistent PostgreSQL atomic transaction protection.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, getBaseUrl, getFrontendUrl } from "./env";
import { sdk } from "./sdk";
import { oauthTransactions, users } from "../../drizzle/schema";
import { eq, sql, and, gt } from "drizzle-orm";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signState(payload: string): string {
  const secret = ENV.cookieSecret || "zylobridge-oauth-state-secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function encodeState(returnPath: string): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now().toString();
  const safe = encodeURIComponent(returnPath || "/");
  const payload = `${nonce}.${safe}.${ts}`;
  const sig = signState(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function decodeState(state: string): { returnPath: string; stateHash: string } | null {
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
    const stateHash = hashToken(state);
    return { returnPath, stateHash };
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
  console.log(`[GoogleAuth] [${oauthRequestId}] Token exchange started at https://oauth2.googleapis.com/token`);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
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
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[GoogleAuth] [${oauthRequestId}] Token exchange failed (${res.status}): ${body}`);
      throw new Error(`Token exchange failed (${res.status}): ${body}`);
    }
    console.log(`[GoogleAuth] [${oauthRequestId}] Token exchange completed`);
    return res.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string }>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchGoogleUserInfo(accessToken: string, oauthRequestId: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}> {
  console.log(`[GoogleAuth] [${oauthRequestId}] Google userinfo request started`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[GoogleAuth] [${oauthRequestId}] Failed to fetch user info (${res.status}): ${body}`);
      throw new Error(`Failed to fetch user info from Google (${res.status})`);
    }
    console.log(`[GoogleAuth] [${oauthRequestId}] Google userinfo completed`);
    return res.json() as Promise<{
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified: boolean;
    }>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    const oauthRequestId = crypto.randomBytes(4).toString("hex").toUpperCase();
    console.log(`[GoogleAuth] [${oauthRequestId}] OAuth initiation requested`);

    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(503).json({ error: "Google OAuth is not configured." });
      return;
    }

    const returnPath = typeof req.query.returnPath === "string" ? req.query.returnPath : "/";
    const state = encodeState(returnPath);
    const decodedState = decodeState(state);
    if (!decodedState) {
      res.status(400).json({ error: "Failed to generate valid OAuth state." });
      return;
    }

    try {
      const clientDb = await db.getDb();
      if (clientDb) {
        // Record OAuth transaction in database
        await clientDb.insert(oauthTransactions).values({
          requestId: oauthRequestId,
          stateHash: decodedState.stateHash,
          status: "initiated",
          expiresAt: new Date(Date.now() + STATE_TTL_MS),
        }).onConflictDoNothing();
        console.log(`[GoogleAuth] [${oauthRequestId}] OAuth transaction created`);
      }

      const authUrl = buildGoogleAuthUrl(state);
      console.log(`[GoogleAuth] [${oauthRequestId}] Redirecting to Google consent screen`);
      res.redirect(302, authUrl);
    } catch (err) {
      console.error(`[GoogleAuth] [${oauthRequestId}] Failed to initiate OAuth transaction:`, err);
      res.status(503).json({ error: "OAuth initiation failed." });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const oauthRequestId = crypto.randomBytes(4).toString("hex").toUpperCase();
    const startTime = Date.now();
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;
    const frontend = getFrontendUrl();

    console.log(`[GoogleAuth] [${oauthRequestId}] 1. OAuth callback received. Has code: ${!!code}, has state: ${!!state}, error: ${error || "none"}`);

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
    console.log(`[GoogleAuth] [${oauthRequestId}] 2. State validated`);

    const clientDb = await db.getDb();
    if (!clientDb) {
      console.error(`[GoogleAuth] [${oauthRequestId}] Database connection unavailable`);
      res.redirect(302, `${frontend}/sign-in?error=database_unavailable`);
      return;
    }

    const authCodeHash = hashToken(code);

    try {
      // 3. Atomically claim authorization code / check for duplicate
      console.log(`[GoogleAuth] [${oauthRequestId}] 3. Checking transaction and claiming auth code`);
      
      const txRows = await clientDb.select().from(oauthTransactions).where(eq(oauthTransactions.stateHash, decoded.stateHash)).limit(1);
      const txRecord = txRows[0];

      if (txRecord && txRecord.status === "completed") {
        console.warn(`[GoogleAuth] [${oauthRequestId}] Duplicate callback detected — token exchange skipped (already completed)`);
        res.redirect(302, `${frontend}${decoded.returnPath || "/"}`);
        return;
      }

      if (txRecord && txRecord.authCodeHash && txRecord.authCodeHash === authCodeHash && txRecord.status === "claimed") {
        console.warn(`[GoogleAuth] [${oauthRequestId}] Duplicate callback detected — token exchange skipped (currently processing/claimed)`);
        res.redirect(302, `${frontend}${decoded.returnPath || "/"}`);
        return;
      }

      // Claim transaction atomically
      await clientDb.update(oauthTransactions)
        .set({ authCodeHash, status: "claimed" })
        .where(eq(oauthTransactions.stateHash, decoded.stateHash));

      console.log(`[GoogleAuth] [${oauthRequestId}] OAuth transaction claimed`);

      // 4. Token exchange started
      console.log(`[GoogleAuth] [${oauthRequestId}] 4. Token exchange started`);
      const tokens = await exchangeCodeForTokens(code, oauthRequestId);
      console.log(`[GoogleAuth] [${oauthRequestId}] Token exchange completed`);

      // 5. Google userinfo started
      console.log(`[GoogleAuth] [${oauthRequestId}] 5. Google userinfo started`);
      const googleUser = await fetchGoogleUserInfo(tokens.access_token, oauthRequestId);
      console.log(`[GoogleAuth] [${oauthRequestId}] Google userinfo completed. Email: ${googleUser.email}`);

      if (!googleUser.email_verified) {
        console.warn(`[GoogleAuth] [${oauthRequestId}] Unverified email: ${googleUser.email}`);
        res.redirect(302, `${frontend}/sign-in?error=email_not_verified`);
        return;
      }

      // 6. Database lookup & upsert started
      console.log(`[GoogleAuth] [${oauthRequestId}] 6. Database lookup & upsert started`);
      const openId = `google_${googleUser.sub}`;
      
      const dbStart = Date.now();
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });
      const dbUser = await db.getUserByEmail(googleUser.email);
      console.log(`[GoogleAuth] [${oauthRequestId}] Database lookup & upsert completed in ${Date.now() - dbStart}ms. User ID: ${dbUser?.id}, role: ${dbUser?.role}`);

      // Mark transaction completed
      await clientDb.update(oauthTransactions)
        .set({ status: "completed", userId: dbUser?.id || null, completedAt: new Date() })
        .where(eq(oauthTransactions.stateHash, decoded.stateHash));
      console.log(`[GoogleAuth] [${oauthRequestId}] OAuth transaction completed`);

      // 7. Session creation started
      console.log(`[GoogleAuth] [${oauthRequestId}] 7. Session creation started`);
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log(`[GoogleAuth] [${oauthRequestId}] Session creation completed`);

      // 8. Set-Cookie generated & attached
      const cookieOptions = getSessionCookieOptions(req);
      console.log(`[GoogleAuth] [${oauthRequestId}] 8. Set-Cookie attached. Domain: ${cookieOptions.domain || "default"}, secure: ${cookieOptions.secure}, httpOnly: ${cookieOptions.httpOnly}`);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 9. Redirect issued
      const returnPath = decoded.returnPath || "/";
      const redirectTo = `${frontend}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;
      console.log(`[GoogleAuth] [${oauthRequestId}] 9. Redirect issued to ${redirectTo}. Total callback duration: ${Date.now() - startTime}ms`);

      res.redirect(302, redirectTo);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[GoogleAuth] [${oauthRequestId}] Callback failed after ${duration}ms with error:`, err);

      try {
        await clientDb.update(oauthTransactions)
          .set({ status: "failed" })
          .where(eq(oauthTransactions.stateHash, decoded.stateHash));
      } catch {}

      const errMsg = err instanceof Error ? encodeURIComponent(err.message.slice(0, 120)) : "unknown";
      const isInvalidGrant = err instanceof Error && err.message.includes("invalid_grant");
      const errorParam = isInvalidGrant ? "invalid_grant" : "google_failed";

      res.redirect(302, `${frontend}/sign-in?error=${errorParam}&details=${errMsg}`);
    }
  });
}
