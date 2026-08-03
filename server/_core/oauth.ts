import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { getBaseUrl } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Decode the state param — it is base64(redirectUri) where redirectUri was
      // set by the frontend as `${window.location.origin}/api/oauth/callback`.
      // On Vercel the frontend correctly encodes its own origin, so this resolves
      // to the Vercel deployment URL automatically.
      const decodedRedirectUri = (() => {
        try {
          return atob(state);
        } catch {
          // Fallback: derive from server-side base URL if state is not valid base64
          const base = getBaseUrl();
          console.warn(`[OAuth] Could not decode state; falling back to ${base}/api/oauth/callback`);
          return `${base}/api/oauth/callback`;
        }
      })();

      console.log(`[OAuth] Callback — redirectUri resolved to: ${decodedRedirectUri}`);

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the origin that initiated the login (extracted from the decoded redirectUri)
      const origin = (() => {
        try {
          return new URL(decodedRedirectUri).origin;
        } catch {
          return getBaseUrl();
        }
      })();

      res.redirect(302, origin + "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
