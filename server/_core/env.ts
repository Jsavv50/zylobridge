export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Google OAuth credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Resend transactional email API key
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // Canonical production URL — set APP_BASE_URL or APP_URL in Railway environment variables
  // e.g. https://zylobridge.up.railway.app
  appBaseUrl: process.env.APP_BASE_URL ?? process.env.APP_URL ?? "",

  // Supabase — for session persistence and user management
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

/**
 * Resolve the canonical base URL for OAuth callbacks.
 *
 * Priority order:
 *   1. APP_BASE_URL or APP_URL — set in Railway environment variables
 *      e.g. https://zylobridge.up.railway.app
 *   2. Localhost fallback for local development
 */
export function getBaseUrl(): string {
  if (ENV.appBaseUrl) return ENV.appBaseUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}
