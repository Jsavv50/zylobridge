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

  // Twilio Programmable Messaging — used only by server-side phone OTP delivery.
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? "",

  // Canonical backend URL — used for Google OAuth callback URIs.
  // Set BACKEND_URL=https://api.zylobridge.com in Railway environment variables.
  // Also accepts APP_BASE_URL or APP_URL as legacy aliases.
  // MUST point to the Railway backend, not the Vercel frontend.
  appBaseUrl:
    process.env.BACKEND_URL ??
    process.env.APP_BASE_URL ??
    process.env.APP_URL ??
    "",

  // Frontend URL — where users are redirected after authentication.
  // Set FRONTEND_URL=https://zylobridge.com in Railway environment variables.
  // Also accepts FRONTEND_BASE_URL as an alias.
  frontendBaseUrl:
    process.env.FRONTEND_URL ??
    process.env.FRONTEND_BASE_URL ??
    "",

  // Supabase — for session persistence and user management
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
};

/**
 * Resolve the canonical backend base URL for Google OAuth callback URIs.
 *
 * Priority order:
 *   1. BACKEND_URL — explicit backend URL (e.g. https://api.zylobridge.com)
 *   2. APP_BASE_URL or APP_URL — legacy aliases
 *   3. Localhost fallback for local development
 *
 * IMPORTANT: This MUST resolve to the Railway backend domain, not the Vercel
 * frontend. The Google OAuth callback URI is built from this value.
 */
export function getBaseUrl(): string {
  if (ENV.appBaseUrl) return ENV.appBaseUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * Resolve the frontend URL for post-authentication redirects.
 *
 * Priority order:
 *   1. FRONTEND_URL — explicit frontend URL (e.g. https://zylobridge.com)
 *   2. FRONTEND_BASE_URL — alias
 *   3. Localhost fallback for local development
 */
export function getFrontendUrl(): string {
  if (ENV.frontendBaseUrl) return ENV.frontendBaseUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}
