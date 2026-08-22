import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveProfileUpsert } from "./db";

describe("Profile upsert contracts", () => {
  it("builds a first-save insert without accepting a client-owned userId", () => {
    const decision = resolveProfileUpsert(undefined, {
      vocation: "painter",
      bio: "Experienced residential painter",
      latitude: "-33.9249",
      longitude: "18.4241",
      serviceRadiusKm: 50,
    });

    expect(decision).toEqual({
      action: "insert",
      data: {
        vocation: "painter",
        bio: "Experienced residential painter",
        latitude: "-33.9249",
        longitude: "18.4241",
        serviceRadiusKm: 50,
      },
    });
    expect(decision.data).not.toHaveProperty("userId");
  });

  it("updates the existing profile row and preserves optional fields", () => {
    const decision = resolveProfileUpsert(42, {
      vocation: "electrician",
      latitude: null,
      longitude: null,
      serviceRadiusKm: 25,
    });

    expect(decision.action).toBe("update");
    expect(decision.profileId).toBe(42);
    expect(decision.data).toMatchObject({
      vocation: "electrician",
      latitude: null,
      longitude: null,
      serviceRadiusKm: 25,
    });
  });

  it("keeps repeated saves on the same user in update mode instead of inserting", () => {
    const firstUpdate = resolveProfileUpsert(42, { bio: "Updated once" });
    const secondUpdate = resolveProfileUpsert(42, { bio: "Updated twice" });

    expect(firstUpdate.action).toBe("update");
    expect(secondUpdate.action).toBe("update");
    expect(firstUpdate.profileId).toBe(secondUpdate.profileId);
  });

  it("requires vocation only when a new profile row must be created", () => {
    expect(() => resolveProfileUpsert(undefined, { bio: "Missing vocation" })).toThrow("Vocation required.");
    expect(resolveProfileUpsert(42, { bio: "Existing profile can update" }).action).toBe("update");
  });

  it("keeps database and router protections in the production source contract", () => {
    const dbCode = fs.readFileSync(path.resolve(__dirname, "./db.ts"), "utf8");
    const routerCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf8");
    const migrationCode = fs.readFileSync(path.resolve(__dirname, "../drizzle/0012_reconcile_profile_location_columns.sql"), "utf8");

    expect(dbCode).toContain("pg_advisory_xact_lock");
    expect(dbCode).toContain("returning()");
    const profileRouterCode = routerCode.slice(routerCode.indexOf("profiles: router({"), routerCode.indexOf("// ── Reviews"));
    const upsertStart = profileRouterCode.indexOf("upsert: protectedProcedure");
    const upsertCode = profileRouterCode.slice(upsertStart);
    expect(upsertCode).toContain("upsertProfile(ctx.user.id");
    expect(upsertCode).not.toContain("input.userId");
    expect(migrationCode).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_unique"');
  });
});
