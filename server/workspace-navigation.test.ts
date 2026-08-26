import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated workspace navigation", () => {
  it("exposes job postings, applications, messages, and notifications through the public shell", () => {
    const navbar = fs.readFileSync(path.resolve(__dirname, "../client/src/components/Navbar.tsx"), "utf8");
    const home = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/Home.tsx"), "utf8");
    expect(navbar).toContain('href: "/applications"');
    expect(navbar).toContain('href: "/employer/jobs"');
    expect(navbar).toContain('href: "/messages"');
    expect(navbar).toContain('href: "/notifications"');
    expect(navbar).toContain("isProfessional");
    expect(navbar).toContain("isClient || isEnterprise");
    for (const route of ["/applications", "/employer/jobs", "/messages", "/notifications", "/payments"]) {
      expect(home).toContain(`href: \"${route}\"`);
    }
  });

  it("keeps the canonical feature routes registered", () => {
    const app = fs.readFileSync(path.resolve(__dirname, "../client/src/App.tsx"), "utf8");
    for (const route of ["/applications", "/employer/jobs", "/messages", "/notifications", "/payments"]) {
      expect(app).toContain(`path=\"${route}\"`);
    }
  });
});
