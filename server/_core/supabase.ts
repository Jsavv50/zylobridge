/**
 * Supabase client helpers — server-side only.
 *
 * Clients are created lazily (on first use) to avoid module-level throws
 * when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set in the
 * environment. This is critical for Vercel serverless cold-starts where
 * missing env vars would otherwise crash the entire function before any
 * request handler runs.
 *
 * Two clients are exported:
 *  - getSupabaseAdmin()  : service-role key, bypasses RLS, for server mutations
 *  - getSupabasePublic() : anon key, respects RLS, for public reads
 *
 * Both return null when credentials are not configured — callers must
 * handle the null case gracefully (Supabase sync is always best-effort).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _adminClient: SupabaseClient | null = null;
let _publicClient: SupabaseClient | null = null;

/**
 * Admin client — service-role key, bypasses Row Level Security.
 * Use only in server-side tRPC procedures and route handlers.
 * Returns null if Supabase credentials are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    console.warn(
      "[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — admin client unavailable."
    );
    return null;
  }
  if (!_adminClient) {
    _adminClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

/**
 * Public client — anon key, respects Row Level Security.
 * Suitable for read-only operations that do not require elevated privileges.
 * Returns null if Supabase credentials are not configured.
 */
export function getSupabasePublic(): SupabaseClient | null {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    console.warn(
      "[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — public client unavailable."
    );
    return null;
  }
  if (!_publicClient) {
    _publicClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _publicClient;
}
