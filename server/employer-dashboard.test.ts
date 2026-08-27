import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("employer command center", () => {
  it("exposes one protected employerDashboard contract with employer role enforcement", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("employerDashboard: protectedProcedure.query");
    expect(routers).toContain('ctx.user.userType !== "client"');
    expect(routers).toContain('ctx.user.userType !== "enterprise"');
    expect(routers).toContain('code: "FORBIDDEN"');
  });

  it("scopes dashboard aggregation to the authenticated employer and real records", () => {
    const analytics = read("server/analytics.ts");
    expect(analytics).toContain("getEmployerCommandCenter(clientId: number)");
    expect(analytics).toContain("eq(jobs.clientId, clientId)");
    expect(analytics).toContain("eq(escrowPayments.clientId, clientId)");
    expect(analytics).toContain("eq(conversations.clientId, clientId)");
    expect(analytics).toContain("recommendedProfessionals");
    expect(analytics).not.toMatch(/Sherry Witt|Painter \| Cape Town|R 85,000/);
  });

  it("keeps employer actions connected to registered marketplace routes", () => {
    const page = read("client/src/pages/ClientDashboard.tsx");
    for (const route of ["/employer/jobs", "/talent", "/messages", "/notifications", "/payments", "/profile", "/jobs/new"]) {
      expect(page).toContain(route);
    }
    expect(page).toContain("Review candidates");
    expect(page).toContain("Payments & escrow");
    expect(page).toContain("Recent messages");
    expect(page).toContain("Recommended professionals");
  });

  it("uses loading, error, empty, and accessible action states instead of a blank dashboard", () => {
    const page = read("client/src/pages/ClientDashboard.tsx");
    expect(page).toContain("We couldn't load your dashboard");
    expect(page).toContain("Try again");
    expect(page).toContain('aria-label="Employer metrics"');
    expect(page).toContain("No jobs yet");
    expect(page).toContain("focus-visible:ring-2");
  });
});
