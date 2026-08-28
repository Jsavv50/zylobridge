import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  isOnboardingComplete,
  requiresCompletedOnboarding,
  resolvePostAuthenticationDestination,
  resolveRoleDashboard,
} from "../shared/onboarding";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("adaptive onboarding contract", () => {
  it("routes incomplete accounts to onboarding and completed roles to canonical workspaces", () => {
    expect(isOnboardingComplete({ userType: "unset", onboardingStatus: "not_started" })).toBe(false);
    expect(resolvePostAuthenticationDestination({ userType: "unset", onboardingStatus: "in_progress" }, "/messages")).toBe("/onboarding");
    expect(resolvePostAuthenticationDestination({ userType: "professional", onboardingStatus: "completed" })).toBe("/dashboard");
    expect(resolvePostAuthenticationDestination({ userType: "client", onboardingStatus: "completed" })).toBe("/employer");
    expect(resolvePostAuthenticationDestination({ userType: "enterprise", onboardingStatus: "completed" })).toBe("/enterprise");
    expect(resolveRoleDashboard({ role: "SUPER_ADMIN", userType: "unset" })).toBe("/dashboard/admin");
  });

  it("preserves safe intended destinations only for completed accounts", () => {
    const completed = { userType: "professional", onboardingStatus: "completed" } as const;
    expect(resolvePostAuthenticationDestination(completed, "/messages/12")).toBe("/messages/12");
    expect(resolvePostAuthenticationDestination(completed, "https://evil.example")).toBe("/dashboard");
    expect(resolvePostAuthenticationDestination(completed, "//evil.example")).toBe("/dashboard");
  });

  it("gates private workspaces while leaving public discovery routes available", () => {
    expect(requiresCompletedOnboarding("/messages")).toBe(true);
    expect(requiresCompletedOnboarding("/jobs/new")).toBe(true);
    expect(requiresCompletedOnboarding("/shop/account")).toBe(true);
    expect(requiresCompletedOnboarding("/shop/admin")).toBe(true);
    expect(requiresCompletedOnboarding("/jobs/42")).toBe(false);
    expect(requiresCompletedOnboarding("/professionals/42")).toBe(false);
    expect(requiresCompletedOnboarding("/shop/product/tool-kit")).toBe(false);
    expect(requiresCompletedOnboarding("/how-it-works")).toBe(false);
  });
});

describe("adaptive onboarding persistence and security", () => {
  const schema = read("drizzle/schema.ts");
  const migration = read("drizzle/0020_adaptive_onboarding.sql");
  const service = read("server/onboarding.ts");
  const router = read("server/routers/onboarding.ts");
  const appRouter = read("server/routers.ts");

  it("uses additive backward-compatible onboarding columns and a non-destructive migration", () => {
    expect(schema).toContain('onboardingStatus: onboardingStatusEnum("onboardingStatus")');
    expect(schema).toContain('onboardingStep: integer("onboardingStep")');
    expect(schema).toContain('onboardingData: jsonb("onboardingData")');
    expect(schema).toContain('onboardingRevision: integer("onboardingRevision")');
    expect(schema).toContain('onboardingCompletedAt: timestamp("onboardingCompletedAt"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "onboardingStatus"');
    expect(migration).toContain('WHERE "userType" <> \'unset\'');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it("keeps reads and writes ownership-scoped with optimistic revision control", () => {
    expect(service).toContain("getOnboardingState(userId: number)");
    expect(service).toContain("where(eq(users.id, userId))");
    expect(service).toContain("user.onboardingRevision !== input.expectedRevision");
    expect(service).toContain("OnboardingRevisionConflict");
    expect(router).toContain("protectedProcedure");
    expect(router).toContain("ctx.user.id");
    expect(router).not.toContain("input.userId");
  });

  it("completes role and dependent records transactionally and idempotently", () => {
    expect(service).toContain("db.transaction(async (tx)");
    expect(service).toContain('onboardingStatus: "completed"');
    expect(service).toContain("onboardingCompletedAt: user.onboardingCompletedAt ?? now");
    expect(service).toContain("const [profile]");
    expect(service).toContain("const [membership]");
    expect(service).toContain("onConflictDoUpdate");
    expect(service).toContain("notificationPreferences");
  });

  it("mounts onboarding as one protected tRPC namespace without parallel identity systems", () => {
    expect(appRouter).toContain('import { onboardingRouter } from "./routers/onboarding"');
    expect(appRouter).toContain("onboarding: onboardingRouter");
    expect(router).toContain("state: protectedProcedure.query");
    expect(router).toContain("saveStep: protectedProcedure");
    expect(router).toContain("complete: protectedProcedure");
  });
});

describe("adaptive onboarding interface and integrations", () => {
  const page = read("client/src/pages/Onboarding.tsx");
  const app = read("client/src/App.tsx");
  const signIn = read("client/src/pages/SignIn.tsx");
  const googleAuth = read("server/_core/googleAuth.ts");
  const professionalDashboard = read("client/src/pages/ProfessionalDashboard.tsx");
  const profile = read("client/src/pages/UserProfile.tsx");

  it("renders a four-stage adaptive, accessible, role-specific flow", () => {
    expect(page).toContain("Stage {step} of 4");
    expect(page).toContain("What do you want to accomplish first?");
    expect(page).toContain("Contractor / Client");
    expect(page).toContain("Skilled Professional");
    expect(page).toContain('title: "Enterprise"');
    expect(page).toContain("VocationSelector");
    expect(page).toContain('aria-current={item.number === step ? "step" : undefined}');
    expect(page).toContain("Review and edit your personalized workspace.");
    expect(page).toContain("Live workspace preview");
  });

  it("supports durable autosave, local recovery, conflict handling, and truthful offline states", () => {
    expect(page).toContain("zylo-onboarding-draft");
    expect(page).toContain("expectedRevision: revisionRef.current");
    expect(page).toContain("lastAttemptRef");
    expect(page).toContain('saveState === "offline"');
    expect(page).toContain("Progress is saved on this device");
    expect(page).toContain(">Retry</Button>");
  });

  it("uses one centralized onboarding gate without conditional-hook violations", () => {
    expect(app).toContain("function OnboardingGate");
    expect(app).toContain("requiresCompletedOnboarding(location)");
    expect(app).toContain("useEffect(() =>");
    expect(app).toContain("<OnboardingGate><Suspense");
    const functionStart = app.indexOf("function OnboardingGate");
    const returnFallback = app.indexOf("if (shouldRedirect) return", functionStart);
    expect(app.indexOf("useEffect(() =>", functionStart)).toBeLessThan(returnFallback);
  });

  it("redirects unauthenticated onboarding visits through the safe SignIn handoff without rendering a blank page", () => {
    expect(page).toContain('const signInNext = profileMode ? "/onboarding?mode=profile" : "/onboarding"');
    expect(page).toContain('navigate(`/sign-in?next=${encodeURIComponent(signInNext)}`, { replace: true })');
    expect(page).toContain("authLoading || !user || onboarding.isLoading");
    expect(page).not.toContain("if (!user) return null");
  });

  it("routes every sign-in method through the shared onboarding-aware resolver", () => {
    expect(signIn).toContain("resolvePostAuthenticationDestination");
    expect(signIn).toContain("await refresh()");
    expect(signIn).not.toContain('navigate("/");');
    expect(googleAuth).toContain("resolvePostAuthenticationDestination");
    expect(googleAuth).not.toContain('const returnPath = decoded.returnPath || "/"');
  });

  it("routes incomplete profile actions into resumable onboarding profile mode", () => {
    expect(professionalDashboard).toContain('"/onboarding?mode=profile"');
    expect(profile).toContain('/onboarding?mode=profile');
  });

  it("contains no fabricated testimonials, ratings, reviews, or marketplace success metrics", () => {
    const lower = page.toLowerCase();
    expect(lower).not.toMatch(/testimonial|five-star|5-star|thousands of|success rate/);
    expect(page).not.toMatch(/\b[1-9][0-9]{2,}%\b/);
    expect(signIn.toLowerCase()).not.toMatch(/thousands of|success rate|five-star|5-star/);
  });
});
