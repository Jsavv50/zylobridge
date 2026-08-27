import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Browse Jobs marketplace integration", () => {
  const page = read("client/src/pages/JobsMarketplace.tsx");
  const card = read("client/src/components/JobCard.tsx");
  const detail = read("client/src/pages/JobDetail.tsx");
  const router = read("server/routers.ts");
  const schema = read("drizzle/schema.ts");

  it("uses the real jobs search contract and preserves filter state", () => {
    expect(page).toContain("trpc.jobs.search.useQuery(input)");
    expect(page).toContain('navigate(params.toString() ? `/jobs?${params.toString()}` : "/jobs")');
    expect(page).toContain("minBudget");
    expect(page).toContain("maxBudget");
    expect(page).toContain("isUrgent");
    expect(router).toContain('isUrgent: z.boolean().optional()');
    expect(router).toContain('status: z.enum(["open", "in_progress", "completed", "cancelled"])');
  });

  it("has a mobile filter dialog, discovery tabs, pagination, and honest states", () => {
    expect(page).toContain("mobileFiltersOpen");
    expect(page).toContain('role="tablist"');
    expect(page).toContain('aria-selected={view === value}');
    expect(page).toContain("Previous");
    expect(page).toContain("Next");
    expect(page).toContain("We couldn't load jobs");
    expect(page).toContain("No jobs match your current search");
  });

  it("supports real saved-job persistence with professional authorization", () => {
    expect(page).toContain("trpc.savedJobs.ids.useQuery");
    expect(page).toContain("trpc.savedJobs.toggle.useMutation");
    expect(card).toContain("onToggleSave");
    expect(card).toContain("aria-pressed={saved}");
    expect(router).toContain("Only professionals can save jobs.");
    expect(schema).toContain('pgTable("saved_jobs"');
    expect(schema).toContain("saved_jobs_job_professional_unique");
  });

  it("keeps detail navigation contextual and actions real", () => {
    expect(card).toContain("encodeURIComponent(returnTo)");
    expect(detail).toContain("backHref");
    expect(detail).toContain("trpc.savedJobs.status.useQuery");
    expect(detail).toContain("Share");
    expect(detail).toContain("trpc.applications.submitApplication");
  });

  it("does not invent unsupported job attributes or expose raw database IDs", () => {
    expect(card).not.toContain("Job #");
    expect(page).not.toContain("5 km");
    expect(page).not.toContain("10+ years");
    expect(page).not.toContain("Response rate");
    expect(page).not.toContain("95% Profile Match");
  });
});
