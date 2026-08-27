import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("homepage marketplace redesign", () => {
  const home = read("client/src/pages/Home.tsx");
  const footer = read("client/src/components/Footer.tsx");
  const navbar = read("client/src/components/Navbar.tsx");
  const app = read("client/src/App.tsx");

  it("uses live jobs and professional discovery data", () => {
    expect(home).toContain("trpc.jobs.search.useQuery");
    expect(home).toContain("trpc.talent.search.useQuery");
    expect(home).toContain("/jobs/${job.id}");
    expect(home).toContain("/professionals/${person.id}");
    expect(home).toContain("No public profiles are available in this view yet");
    expect(home).toContain("No open jobs are available right now");
  });

  it("keeps homepage claims truthful and avoids fake marketplace activity", () => {
    for (const phrase of ["12 Featured Vocations", "Join thousands", "5-star reviews", "across North America", "GDPR compliant", "24/7 dispute resolution"]) {
      expect(home.toLowerCase()).not.toContain(phrase.toLowerCase());
      expect(footer.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
    expect(home).toContain("Verification where available");
    expect(home).toContain("No invented profiles or ratings are used.");
  });

  it("uses the canonical taxonomy and real marketplace filter links", () => {
    expect(home).toContain("VOCATION_CATEGORIES");
    expect(home).toContain("/talent?vocation=${key}");
    expect(home).toContain("/talent?${params.toString()}");
    expect(home).toContain("Explore all professions");
  });

  it("covers the primary two-sided journeys and existing routes", () => {
    for (const route of ["/talent", "/jobs", "/enterprise", "/how-it-works"]) {
      expect(home).toContain(route);
    }
    expect(home).toContain('"/jobs/new"');
    expect(home).toContain('"/sign-in"');
    expect(app).toContain('<Route path="/talent"');
    expect(app).toContain('<Route path="/jobs"');
    expect(app).toContain('<Route path="/enterprise"');
  });

  it("keeps official logo and responsive navigation patterns", () => {
    expect(footer).toContain("<ZylobridgeLogo");
    expect(navbar).toContain("<ZylobridgeLogo />");
    expect(navbar).toContain("Find Professionals");
    expect(navbar).toContain("Enterprise");
    expect(navbar).toContain("md:hidden");
    expect(home).toContain("overflow-x-hidden");
    expect(home).toContain("sr-only");
  });

  it("does not include placeholder footer links", () => {
    expect(footer).not.toContain('href: "#"');
    expect(footer).not.toContain("GDPR Compliance");
    for (const route of ["/privacy-policy", "/terms", "/cookie-policy", "/talent", "/jobs", "/enterprise"]) {
      expect(footer).toContain(`href: \"${route}\"`);
    }
  });
});
