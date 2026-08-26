/**
 * Browser-side Supabase client & Realtime authorization helper.
 *
 * Uses ONLY public SUPABASE_URL and SUPABASE_ANON_KEY (injected via Vite env).
 * Fetches short-lived authorization tokens from GET /api/realtime/token with credentials: "include"
 * so the existing Zylobridge HttpOnly session cookie authenticates the request.
 * Automatically refreshes the Realtime token before expiration without re-authenticating the user.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let clientInstance: SupabaseClient | null = null;
let refreshTimer: number | null = null;
let activeAuthPromise: Promise<boolean> | null = null;

/**
 * Get or initialize the singleton public Supabase browser client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!clientInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("[SupabaseBrowser] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.");
    }
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
}

/**
 * Fetch a short-lived Realtime authorization token from the backend.
 * Automatically includes credentials (cookies) to authenticate via the Zylobridge session.
 */
async function fetchRealtimeToken(): Promise<{ token: string; expiresIn: number } | null> {
  try {
    const res = await fetch("/api/realtime/token", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[SupabaseBrowser] Failed to fetch realtime token: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data || typeof data.token !== "string" || typeof data.expiresIn !== "number") {
      console.warn("[SupabaseBrowser] Invalid realtime token response format");
      return null;
    }

    return {
      token: data.token,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    console.warn("[SupabaseBrowser] Error fetching realtime token:", String(error));
    return null;
  }
}

/**
 * Initialize Supabase Realtime authentication using the backend session bridge.
 * Single-flight guard prevents duplicate concurrent token requests.
 * Sets auth and schedules automatic token refresh before expiration.
 */
export async function initSupabaseRealtimeAuth(): Promise<boolean> {
  if (activeAuthPromise) {
    return activeAuthPromise;
  }

  activeAuthPromise = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const tokenData = await fetchRealtimeToken();
      if (!tokenData) {
        throw new Error("Failed to obtain valid realtime token from bridge");
      }

      // Set auth on Supabase Realtime client
      supabase.realtime.setAuth(tokenData.token);
      console.log("[SupabaseBrowser] Realtime setAuth successful");

      // Schedule refresh before expiration (e.g., refresh 5 minutes before expiration, or 1 minute minimum)
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }

      const refreshIntervalMs = Math.max((tokenData.expiresIn - 300) * 1000, 60 * 1000);
      refreshTimer = window.setTimeout(async () => {
        console.log("[SupabaseBrowser] Refreshing Realtime authorization token...");
        try {
          const freshTokenData = await fetchRealtimeToken();
          if (freshTokenData) {
            supabase.realtime.setAuth(freshTokenData.token);
            console.log("[SupabaseBrowser] Realtime token refreshed successfully via setAuth");
          }
        } catch (refreshErr) {
          console.warn("[SupabaseBrowser] Realtime token refresh failed:", String(refreshErr));
        }
      }, refreshIntervalMs);

      return true;
    } catch (err) {
      console.error("[SupabaseBrowser] initSupabaseRealtimeAuth error:", String(err));
      throw err;
    } finally {
      activeAuthPromise = null;
    }
  })();

  return activeAuthPromise;
}
