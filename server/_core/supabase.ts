/**
 * Supabase client helpers — server-side only.
 *
 * Two clients are exported:
 *  - supabaseAdmin   : uses the service-role key; bypasses RLS; for server mutations
 *  - supabasePublic  : uses the anon key; respects RLS; for public reads
 */
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

function assertSupabaseConfig() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables."
    );
  }
}

/**
 * Admin client — service-role key, bypasses Row Level Security.
 * Use only in server-side tRPC procedures and route handlers.
 */
export function getSupabaseAdmin() {
  assertSupabaseConfig();
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Public client — anon key, respects Row Level Security.
 * Suitable for read-only operations that do not require elevated privileges.
 */
export function getSupabasePublic() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error(
      "[Supabase] SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables."
    );
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
