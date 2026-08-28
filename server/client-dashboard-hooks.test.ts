import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Contractor and Client dashboard hook-order regression", () => {
  const page = read("client/src/pages/ClientDashboard.tsx");
  const app = read("client/src/App.tsx");
  const routeBoundary = read("client/src/components/EmployerDashboardBoundary.tsx");
  const globalBoundary = read("client/src/components/ErrorBoundary.tsx");

  it("executes every dashboard hook before the first conditional render return", () => {
    const firstConditionalReturn = page.indexOf("if (!user) return");
    expect(firstConditionalReturn).toBeGreaterThan(0);

    const hookPattern = /\b(?:useAuth|useState|useMemo|useEffect|useCallback|useRef|useReducer|useContext|useQuery|useMutation|useUtils)\s*\(/g;
    const hookIndexes = Array.from(page.matchAll(hookPattern), (match) => match.index ?? -1);
    expect(hookIndexes.length).toBeGreaterThan(0);
    expect(hookIndexes.every((index) => index < firstConditionalReturn)).toBe(true);
    expect(page.slice(firstConditionalReturn)).not.toMatch(hookPattern);
  });

  it("keeps useMemo unconditional and handles missing dashboard data inside its callback", () => {
    const memoIndex = page.indexOf("const attention = useMemo");
    const missingUserReturnIndex = page.indexOf("if (!user) return");
    expect(memoIndex).toBeGreaterThan(0);
    expect(memoIndex).toBeLessThan(missingUserReturnIndex);
    expect(page).toContain("if (!dashboard) return [];");
    expect(page).toContain("dashboard.jobs ?? []");
  });

  it("uses /employer as the canonical dashboard and redirects legacy aliases without loops", () => {
    const navbar = read("client/src/components/Navbar.tsx");
    const home = read("client/src/pages/Home.tsx");
    const onboarding = read("client/src/pages/Onboarding.tsx");
    expect(app).toContain('<Route path="/employer" component={EmployerDashboardRoute} />');
    expect(app).toContain('<Route path="/dashboard/contractor"><Redirect to="/employer" replace /></Route>');
    expect(app).toContain('<Route path="/dashboard/client"><Redirect to="/employer" replace /></Route>');
    expect(app).not.toContain('path="/employer"><Redirect');
    expect(navbar).not.toContain('href="/dashboard/contractor"');
    expect(home).toContain(': "/employer";');
    expect(onboarding).toContain("resolveRoleDashboard(user)");
  });

  it("retains role isolation and safe loading, unauthorized, error, and empty states", () => {
    expect(page).toContain('redirectOnUnauthenticated: true');
    expect(page).toContain('["client", "enterprise"].includes(user.userType)');
    expect(page).toContain('["admin", "SUPER_ADMIN"].includes(user.role)');
    expect(page).toContain("Employer workspace required");
    expect(page).toContain("We couldn't load your dashboard");
    expect(page).toContain("No jobs yet");
    expect(page).toContain("Try again");
  });

  it("provides dashboard-scoped recovery and optional observability without exposing raw stacks", () => {
    expect(app).toContain("<EmployerDashboardBoundary><ClientDashboard /></EmployerDashboardBoundary>");
    expect(routeBoundary).toContain("Retry dashboard");
    expect(routeBoundary).toContain("Return home");
    expect(routeBoundary).toContain("Sentry?.captureException");
    expect(globalBoundary).toContain("Retry Page");
    expect(globalBoundary).toContain("Return Home");
    expect(globalBoundary).not.toContain("this.state.error?.stack");
  });
});
