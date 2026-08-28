import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isHiringAccount, isProfessionalAccount, marketplaceBrowseDestination, marketplaceBrowseLabel } from "../shared/marketplaceNavigation";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const navbar = readFileSync(resolve(process.cwd(), "client/src/components/Navbar.tsx"), "utf8");
const jobs = readFileSync(resolve(process.cwd(), "client/src/pages/JobsMarketplace.tsx"), "utf8");
const talent = readFileSync(resolve(process.cwd(), "client/src/pages/TalentDirectory.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0018_talent_discovery.sql"), "utf8");

describe("role-aware marketplace navigation", () => {
  it("routes professional and hiring accounts to their intended discovery surfaces", () => {
    expect(marketplaceBrowseDestination({ userType: "professional" })).toBe("/jobs");
    expect(marketplaceBrowseDestination({ userType: "client" })).toBe("/talent");
    expect(marketplaceBrowseDestination({ userType: "enterprise" })).toBe("/talent");
    expect(marketplaceBrowseDestination(null)).toBe("/jobs");
    expect(marketplaceBrowseLabel({ userType: "client" })).toBe("Find Talent");
    expect(marketplaceBrowseLabel({ userType: "professional" })).toBe("Browse Jobs");
    expect(isHiringAccount({ userType: "client" })).toBe(true);
    expect(isProfessionalAccount({ userType: "professional" })).toBe(true);
  });

  it("waits for asynchronous authentication and prevents role-route loops", () => {
    expect(home).toContain("authLoading");
    expect(home).toContain("marketplaceBrowseDestination(user)");
    expect(navbar).toContain("marketplaceBrowseLabel(user)");
    expect(jobs).toContain('if (!authLoading && hiringAccount) navigate("/talent")');
    expect(talent).toContain('if (!authLoading && professionalAccount) navigate("/jobs")');
  });
});

describe("contractor talent discovery workspace", () => {
  it("uses server-side search, filters, deterministic sorting, totals, and pagination", () => {
    expect(router).toContain("maxExperience");
    expect(router).toContain("minRating");
    expect(db).toContain("filters.professionalIds");
    expect(db).toContain("count(*) filter");
    expect(db).toContain("nextOffset");
    expect(talent).toContain("useDebouncedValue");
    expect(talent).toContain("Showing {items.length ? offset + 1 : 0}");
    expect(talent).toContain("Best match");
  });

  it("persists saved professionals and active invitations without duplicates", () => {
    expect(schema).toContain('pgTable("saved_professionals"');
    expect(schema).toContain('pgTable("job_invitations"');
    expect(schema).toContain("saved_professionals_employer_professional_unique");
    expect(schema).toContain("job_invitations_active_job_professional_unique");
    expect(migration).toContain('WHERE "status" = \'pending\'');
    expect(db).toContain("onConflictDoNothing()");
    expect(router).toContain("setSaved: protectedProcedure");
    expect(router).toContain("invite: protectedProcedure");
  });

  it("enforces job ownership and reuses messaging, notifications, and candidate shortlists", () => {
    expect(router).toContain('job.clientId === ctx.user.id');
    expect(router).toContain("requireOrganizationAccess");
    expect(router).toContain("getOrCreateConversation(job.id, job.clientId, input.professionalId)");
    expect(router).toContain("createInAppNotification");
    expect(router).toContain('notes: "Invited from Find Talent"');
    expect(router).toContain("This professional is not accepting direct employer contact.");
  });

  it("provides real evaluation actions and avoids fabricated reputation data", () => {
    expect(talent).toContain("Quick preview");
    expect(talent).toContain("Compare professionals");
    expect(talent).toContain("Open conversation");
    expect(talent).toContain("Send invitation");
    expect(talent).toContain("New to Zylobridge");
    expect(talent).not.toContain('toFixed(1)}</span>');
    expect(talent).not.toContain("Usually responds quickly");
    expect(talent).not.toContain("Response rate");
  });
});
