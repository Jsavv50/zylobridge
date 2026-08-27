import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  VOCATION_CATEGORIES,
  VOCATION_KEYS,
  VOCATION_LABELS,
  getVocationLabel,
  normalizeVocation,
  searchVocations,
} from "../shared/vocations";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("canonical vocation taxonomy", () => {
  it("contains every requested category and a unique canonical key set", () => {
    expect(VOCATION_CATEGORIES.map((category) => category.label)).toEqual([
      "Construction & Structural Trades",
      "Electrical, Energy & Building Technology",
      "Plumbing, Water & Environmental Systems",
      "Civil Engineering, Roads & Infrastructure",
      "Mechanical, Industrial & Plant Trades",
      "Transport, Logistics & Fleet",
      "Agriculture, Land & Forestry",
      "Property, Facilities & Maintenance",
      "Safety, Security & Fire Protection",
      "Technology, Inspection & Specialized Services",
    ]);
    expect(new Set(VOCATION_KEYS).size).toBe(VOCATION_KEYS.length);
    expect(VOCATION_KEYS).toContain("electrician");
    expect(VOCATION_KEYS).toContain("solar_pv_installer");
    expect(VOCATION_KEYS).toContain("civil_engineer");
    expect(VOCATION_KEYS).toContain("drone_operator");
    expect(Object.keys(VOCATION_LABELS).sort()).toEqual([...VOCATION_KEYS].sort());
  });

  it("normalizes canonical keys, display labels, and slash-spacing variants", () => {
    expect(normalizeVocation("electrician")).toBe("electrician");
    expect(normalizeVocation("Solar PV Installer")).toBe("solar_pv_installer");
    expect(normalizeVocation("Welder/Fabricator")).toBe("welder_fabricator");
    expect(normalizeVocation("not-a-real-vocation")).toBeUndefined();
    expect(getVocationLabel("solar_pv_installer")).toBe("Solar PV Installer");
  });

  it("searches labels and returns each canonical key once", () => {
    const results = searchVocations("technician");
    expect(results.length).toBeGreaterThan(10);
    expect(new Set(results.map((result) => result.key)).size).toBe(results.length);
    expect(results.some((result) => result.key === "hvac_technician")).toBe(true);
    expect(searchVocations("drone")[0]?.label).toBe("Drone Operator");
  });

  it("uses the shared selector in profile and job-posting workflows", () => {
    expect(source("client/src/pages/EditProfile.tsx")).toContain("@/components/VocationSelector");
    expect(source("client/src/pages/JobPosting.tsx")).toContain("@/components/VocationSelector");
    expect(source("client/src/components/VocationSelector.tsx")).toContain("Search vocation...");
    expect(source("server/routers.ts")).toContain("canonicalizeVocation");
  });

  it("keeps the additive migration non-destructive and idempotent", () => {
    const migration = source("drizzle/0012_expand_vocation_enum.sql");
    expect(migration).toContain("ADD VALUE IF NOT EXISTS");
    expect(migration).not.toMatch(/DROP\s+(TYPE|TABLE|COLUMN)/i);
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
  });
});
