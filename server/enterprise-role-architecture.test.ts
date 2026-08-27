import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Enterprise frontend role integration", () => {
  it("registers one Enterprise dashboard route with onboarding and navigation entry points", async () => {
    const [app, onboarding, navbar, dashboard, schema] = await Promise.all([
      readFile(join(root, "client/src/App.tsx"), "utf8"),
      readFile(join(root, "client/src/pages/Onboarding.tsx"), "utf8"),
      readFile(join(root, "client/src/components/Navbar.tsx"), "utf8"),
      readFile(join(root, "client/src/pages/EnterpriseDashboard.tsx"), "utf8"),
      readFile(join(root, "drizzle/schema.ts"), "utf8"),
    ]);

    expect(schema).toContain('["client", "professional", "enterprise", "unset"]');
    expect(app).toContain('path="/dashboard/enterprise" component={EnterpriseDashboard}');
    expect(onboarding).toContain('setSelected("enterprise")');
    expect(onboarding).toContain('navigate("/dashboard/enterprise")');
    expect(navbar).toContain('const isEnterprise = user?.userType === "enterprise"');
    expect(navbar).toContain('href="/dashboard/enterprise"');
    expect(dashboard).toContain('const isEnterprise = user?.userType === "enterprise"');
    expect(dashboard).toContain('trpc.enterprise.overview.useQuery');
    expect(dashboard).toContain('enabled: isEnterprise');
  });
});
