import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/JobDetail.tsx"), "utf8");
const applicationDetail = readFileSync(resolve(process.cwd(), "client/src/pages/ApplicationDetail.tsx"), "utf8");
const notifications = readFileSync(resolve(process.cwd(), "shared/notifications.ts"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0017_job_reports.sql"), "utf8");

describe("professional job details workspace", () => {
  it("supports context-aware navigation from every professional entry point", () => {
    expect(page).toContain("Back to Find Jobs");
    expect(page).toContain("Back to Application");
    expect(page).toContain("Back to My Applications");
    expect(page).toContain("Back to Dashboard");
    expect(page).toContain("Back to Notifications");
    expect(page).toContain("const backHref");
    expect(applicationDetail).toContain("from=${encodeURIComponent(\"/applications\")}");
    expect(notifications).toContain("from=${encodeURIComponent(\"/notifications\")}");
  });

  it("uses protected real data for application state, matching, trust, and similar opportunities", () => {
    expect(router).toContain("professionalDetails: protectedProcedure");
    expect(router).toContain("getProfessionalJobDetails(ctx.user.id, input.id)");
    expect(db).toContain("calculateExplainableJobMatch(profile, job)");
    expect(db).toContain("getApplicationByJobAndProfessionalId(jobId, professionalId)");
    expect(db).toContain("searchJobs({ vocation: job.vocation, status: \"open\"");
    expect(page).toContain("Explainable compatibility signals");
    expect(page).toContain("You've been shortlisted");
    expect(page).toContain("About the client");
    expect(page).toContain("More opportunities you may like");
  });

  it("preserves save and application safety through server contracts and local draft state", () => {
    expect(router).toContain("savedJobs: router");
    expect(router).toContain("saveJob({ jobId: input.jobId, professionalId: ctx.user.id })");
    expect(router).toContain("hasActiveApplication(input.jobId, ctx.user.id)");
    expect(page).toContain("Your draft is still here; please try again.");
    expect(page).toContain("Preview application");
    expect(page).toContain("Submit application");
    expect(page).toContain("professionalDetails.invalidate({ id: jobId })");
  });

  it("uses explicit currency, deadline intelligence, share fallback, and accessible reporting", () => {
    expect(page).toContain("formatJobBudget(job.budget, job.currency)");
    expect(page).toContain("Closes today");
    expect(page).toContain("Closes tomorrow");
    expect(page).toContain("Deadline passed");
    expect(page).toContain("navigator.share");
    expect(page).toContain("Job link copied.");
    expect(page).toContain("role=\"dialog\"");
    expect(router).toContain("reason: z.enum([\"suspicious\", \"misleading\", \"inappropriate\", \"duplicate\", \"other\"])");
    expect(schema).toContain('pgTable("job_reports"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "job_reports"');
  });

  it("uses the authoritative application job ID and preserves application context", () => {
    const applicationsPage = readFileSync(resolve(process.cwd(), "client/src/pages/ProfessionalApplications.tsx"), "utf8");
    expect(applicationsPage).toContain("/jobs/${application.job.id}?from=${encodeURIComponent(`/applications/${application.id}`)}");
    expect(applicationDetail).toContain("/jobs/${application.job.id}?from=${encodeURIComponent(\"/applications\")}");
    expect(db).toContain("eq(applications.jobId, jobId)");
    expect(db).toContain("eq(applications.professionalId, professionalId)");
  });

  it("allows legitimate historical application access without exposing unrelated closed jobs", () => {
    expect(db).toContain('if (job.status !== "open" && !application) return undefined;');
    expect(page).toContain("authLoading");
    expect(page).toContain("selectedQuery");
    expect(page).toContain("This job is no longer accepting applications.");
    expect(page).toContain("Job no longer available");
    expect(page).toContain("You don't have access to this opportunity");
    expect(page).toContain("We couldn't load this job");
    expect(page).toContain("Back to Application");
    expect(page).toContain("Application submitted");
    expect(page).toContain("Applications are closed for this opportunity.");
  });

  it("does not reintroduce fabricated client data or placeholder metrics", () => {
    expect(page).not.toContain("MASON NEEDED");
    expect(page).not.toContain("Cape Town • Posted 2 days ago");
    expect(page).not.toContain("12 jobs posted");
    expect(page).not.toContain("9 successful hires");
    expect(page).not.toContain("fake");
  });
});
