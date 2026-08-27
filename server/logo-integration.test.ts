import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("official ZYLOBRIDGE logo integration", () => {
  it("keeps the authentic asset in the public frontend surface", () => {
    expect(existsSync(resolve(projectRoot, "client/public/ZYLO.png"))).toBe(true);
    expect(read("client/src/components/ZylobridgeLogo.tsx")).toContain('src="/ZYLO.png"');
  });

  it("makes the reusable brand mark an accessible SPA link to home", () => {
    const source = read("client/src/components/ZylobridgeLogo.tsx");
    expect(source).toContain('href="/"');
    expect(source).toContain('aria-label="Go to Zylobridge homepage"');
    expect(source).toContain('alt="ZYLOBRIDGE official logo"');
  });

  it("uses the shared component across primary navigation and standalone surfaces", () => {
    for (const relativePath of [
      "client/src/components/Navbar.tsx",
      "client/src/components/Footer.tsx",
      "client/src/pages/Home.tsx",
      "client/src/pages/Onboarding.tsx",
      "client/src/components/DashboardLayout.tsx",
      "client/src/components/DashboardLayoutSkeleton.tsx",
      "client/src/components/shell/ZyloShell.tsx",
      "client/src/pages/SignIn.tsx",
      "client/src/pages/NotFound.tsx",
    ]) {
      expect(read(relativePath), relativePath).toContain("ZylobridgeLogo");
    }
  });

  it("does not retain duplicate local logo URL constants or a generic shell placeholder", () => {
    for (const relativePath of [
      "client/src/components/Navbar.tsx",
      "client/src/components/Footer.tsx",
      "client/src/pages/Home.tsx",
      "client/src/pages/Onboarding.tsx",
      "client/src/pages/SignIn.tsx",
    ]) {
      expect(read(relativePath), relativePath).not.toContain("const LOGO_URL");
    }
    expect(read("client/src/components/shell/ZyloShell.tsx")).not.toContain(">Z</span>");
  });

  it("keeps Home free of fabricated social proof and hardcoded marketplace totals", () => {
    const home = read("client/src/pages/Home.tsx");
    for (const forbidden of ["TESTIMONIALS", "Trustpilot", "What Our Community Says", "Avg. Rating", "2,400+", "8,900+", "1,200+"]) {
      expect(home, forbidden).not.toContain(forbidden);
    }
  });
});
