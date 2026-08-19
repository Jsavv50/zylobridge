import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

const projectRoot = path.resolve(__dirname, "..");
const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("production auth session handoff architecture", () => {
  it("uses one centralized auth.me query and mounts AuthProvider at the app root", () => {
    const authHook = readProjectFile("client/src/_core/hooks/useAuth.ts");
    const app = readProjectFile("client/src/App.tsx");

    expect(authHook.match(/trpc\.auth\.me\.useQuery/g)).toHaveLength(1);
    expect(authHook).toContain("createContext");
    expect(authHook).toContain("export function AuthProvider");
    expect(app).toContain("<AuthProvider>");
  });

  it("requires server confirmation before OTP login navigates to the app", () => {
    const signIn = readProjectFile("client/src/pages/SignIn.tsx");

    expect(signIn).toContain("const { isAuthenticated, refresh } = useAuth();");
    expect(signIn).toContain("const authenticatedUser = await refresh();");
    expect(signIn).not.toContain('window.location.href = "/"');
  });

  it("keeps logout centralized and SPA-safe", () => {
    const navbar = readProjectFile("client/src/components/Navbar.tsx");
    const profile = readProjectFile("client/src/pages/UserProfile.tsx");

    expect(navbar).not.toContain("trpc.auth.logout.useMutation");
    expect(navbar).not.toContain('window.location.href = "/"');
    expect(navbar).toContain("await logout()");
    expect(profile).not.toContain("logoutMutation");
    expect(profile).toContain("await logout()");
  });

  it("preserves secure cross-subdomain cookies behind Railway's TLS proxy", () => {
    const forwardedRequest = {
      hostname: "api.zylobridge.com",
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    } as any;
    const options = getSessionCookieOptions(forwardedRequest);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
    expect(options.domain).toBe(".zylobridge.com");
    expect(options.path).toBe("/");
  });

  it("gates private Realtime channels on authenticated token initialization", () => {
    const messaging = readProjectFile("client/src/pages/Messaging.tsx");
    const supabase = readProjectFile("client/src/lib/supabase.ts");

    expect(messaging).toContain("await initSupabaseRealtimeAuth()");
    expect(messaging).toContain("config: {\n            private: true,");
    expect(messaging).toContain("[isAuthenticated, selectedConvId]");
    expect(messaging).not.toContain("[isAuthenticated, selectedConvId, refetchConversations]");
    expect(supabase).toContain('credentials: "include"');
    expect(supabase).toContain("disconnectSupabaseRealtime");
  });

  it("contains no unresolved analytics endpoint placeholder", () => {
    const html = readProjectFile("client/index.html");
    expect(html).not.toContain("%VITE_ANALYTICS_ENDPOINT%");
    expect(html).not.toContain("VITE_ANALYTICS_ENDPOINT");
  });
});
