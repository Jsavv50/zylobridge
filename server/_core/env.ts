export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Google OAuth credentials — set in Vercel env vars
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Resend transactional email API key
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // Vercel deployment URL (auto-injected by Vercel as VERCEL_URL, no protocol prefix)
  vercelUrl: process.env.VERCEL_URL ?? "",

  // Explicit production callback base URL override (optional, takes precedence over VERCEL_URL)
  appBaseUrl: process.env.APP_BASE_URL ?? "",

  // Supabase — for session persistence and user management
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  // Termii SMS API key — for phone OTP delivery
  termiiApiKey: process.env.TERMII_API_KEY ?? "",
};

/**
 * Resolve the canonical base URL for OAuth callbacks.
 *
 * Priority order:
 *   1. APP_BASE_URL  — explicit override (e.g. https://zylobridge.vercel.app)
 *   2. VERCEL_URL   — auto-injected by Vercel (no protocol, e.g. zylobridge.vercel.app)
 *   3. Localhost fallback for local development
 */
export function getBaseUrl(): string {
  if (ENV.appBaseUrl) return ENV.appBaseUrl.replace(/\/$/, "");
  if (ENV.vercelUrl) return `https://${ENV.vercelUrl}`;
  return "http://localhost:3000";
}
