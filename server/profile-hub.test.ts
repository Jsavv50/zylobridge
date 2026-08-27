import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { calculateProfileCompletion, publicProfileMetadata } from "../shared/profile";

describe("Professional Marketplace Profile Hub", () => {
  it("calculates deterministic completion from real profile evidence", () => {
    const input = {
      avatarUrl: "https://example.com/avatar.png",
      profile: { vocation: "electrician", bio: "Electrical installations", skills: "Wiring", hourlyRate: "25", yearsExperience: 5, location: "Lagos", isAvailable: true, profileMetadata: { headline: "Licensed electrician", specializations: ["Commercial wiring"], employmentTypes: ["project"] } },
      portfolioCount: 2,
      experienceCount: 1,
      qualificationCount: 1,
      verifiedCount: 1,
    };
    const first = calculateProfileCompletion(input);
    const second = calculateProfileCompletion(input);
    expect(first).toEqual(second);
    expect(first.percentage).toBe(100);
    expect(first.remaining).toEqual([]);
  });

  it("keeps private marketplace controls out of public profile metadata", () => {
    const publicData = publicProfileMetadata({ headline: "Licensed electrician", visibility: "visible", rateVisibility: "private", dailyRate: 300, startingProjectRate: 1200, minimumProjectValue: 500, allowEmployerContact: true });
    expect(publicData.headline).toBe("Licensed electrician");
    expect(publicData.dailyRate).toBeUndefined();
    expect(publicData.startingProjectRate).toBeUndefined();
    expect(publicData.minimumProjectValue).toBeUndefined();
    expect(publicData.allowEmployerContact).toBe(true);
  });

  it("wires the hub as protected and scopes metadata updates to the current user", () => {
    const router = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf8");
    expect(router).toContain("hub: protectedProcedure");
    expect(router).toContain("updateMetadata: protectedProcedure");
    expect(router).toContain("updateProfile(ctx.user.id, { profileMetadata");
  });

  it("enforces visibility-aware public profile projections", () => {
    const dbCode = fs.readFileSync(path.resolve(__dirname, "./db.ts"), "utf8");
    expect(dbCode).toContain("IS DISTINCT FROM 'hidden'");
    expect(dbCode).toContain("publicProfileMetadata");
    expect(dbCode).toContain("getPublicProfileByUserId");
  });

  it("keeps the authenticated editor and public profile on the shared metadata contract", () => {
    const editor = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/EditProfile.tsx"), "utf8");
    const publicPage = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/ProfessionalProfilePage.tsx"), "utf8");
    expect(editor).toContain("profileMetadata");
    expect(editor).toContain("serviceAreas");
    expect(editor).toContain("allowEmployerContact");
    expect(publicPage).toContain("parseProfileMetadata");
    expect(publicPage).toContain('metadata.rateVisibility !== "private"');
    expect(publicPage).toContain("Where and how I work");
  });

  it("keeps the schema change additive and idempotent", () => {
    const migration = fs.readFileSync(path.resolve(__dirname, "../drizzle/0015_professional_profile_metadata.sql"), "utf8");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration).toContain('"profileMetadata" jsonb');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
