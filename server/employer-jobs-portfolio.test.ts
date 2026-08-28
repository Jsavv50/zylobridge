import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const analytics = read("server/analytics.ts");
const routers = read("server/routers.ts");
const page = read("client/src/pages/EmployerJobs.tsx");
const app = read("client/src/App.tsx");

describe("employer jobs portfolio contract", () => {
  it("uses one protected role-gated procedure and active organization membership scope", () => {
    expect(routers).toContain("employerJobsPortfolio: protectedProcedure");
    expect(routers).toContain('ctx.user.userType !== "client"');
    expect(routers).toContain('ctx.user.userType !== "enterprise"');
    expect(routers).toContain("getEmployerJobsPortfolio(ctx.user.id");
    expect(analytics).toContain("getEmployerJobsPortfolio(userId: number");
    expect(analytics).toContain('eq(organizationMembers.status, "active")');
    expect(analytics).toContain("or(eq(jobs.clientId, userId), inArray(jobs.organizationId, organizationIds))");
  });

  it("aggregates job relationships in batches and exposes only counts plus the hired professional", () => {
    expect(analytics).toContain("await Promise.all([");
    expect(analytics).toContain("inArray(applications.jobId, jobIds)");
    expect(analytics).toContain("inArray(shortlists.jobId, jobIds)");
    expect(analytics).toContain("inArray(interviews.jobId, jobIds)");
    expect(analytics).toContain("inArray(engagements.jobId, jobIds)");
    expect(analytics).toContain("inArray(escrowPayments.jobId, jobIds)");
    expect(analytics).toContain("hiredProfessionalById");
    expect(analytics).not.toContain("coverLetter: applications.coverLetter");
  });

  it("keeps urgency separate from lifecycle and derives truthful attention states", () => {
    expect(analytics).toContain("isUrgent: jobs.isUrgent");
    expect(analytics).toContain("const fundingRequired");
    expect(analytics).toContain("awaitingReviewCount > 0");
    expect(analytics).toContain("ageDays >= 7");
    expect(analytics).toContain('status?: "all" | "open" | "hiring" | "attention"');
    expect(analytics).not.toContain('status: "urgent"');
  });

  it("validates filter, sort, and pagination inputs server-side", () => {
    for (const value of ["attention", "awaiting_review", "no_applicants", "budget_desc", "budget_asc"]) {
      expect(routers).toContain(`"${value}"`);
    }
    expect(routers).toContain("limit: z.number().int().min(1).max(50)");
    expect(routers).toContain("offset: z.number().int().nonnegative()");
    expect(analytics).toContain("filtered.slice(offset, offset + limit)");
  });
});

describe("My Job Postings command center", () => {
  it("is registered at the canonical route and links only to supported destinations", () => {
    expect(app).toContain('<Route path="/employer/jobs" component={EmployerJobs} />');
    for (const route of ["/jobs/new", "/jobs/${job.id}", "/employer/jobs/${job.id}/candidates", "/talent?jobId=${job.id}", "/payments?jobId=${job.id}", "/messages/${job.conversationId}"]) {
      expect(`${page}\n${analytics}`).toContain(route);
    }
  });

  it("provides live summaries, lifecycle tabs, URL state, debounced search, and pagination", () => {
    for (const label of ["Total Jobs", "Open Jobs", "Needs Attention", "In Progress", "Completed", "All Jobs", "Hiring", "Closed"]) {
      expect(page).toContain(label);
    }
    expect(page).toContain("useDebouncedValue(search)");
    expect(page).toContain("window.history.replaceState");
    expect(page).toContain('placeholder="Search your jobs..."');
    expect(page).toContain("data?.nextOffset");
  });

  it("uses context-aware actions and confirmation for lifecycle mutations", () => {
    for (const label of ["Review Candidates", "Find Talent", "Fund Escrow", "View Active Job", "Close Posting", "Reopen Posting", "Mark Complete"]) {
      expect(`${page}\n${analytics}`).toContain(label);
    }
    expect(page).toContain("<AlertDialog");
    expect(page).toContain("escrow release remains controlled by the existing payment workflow");
    expect(page).toContain("updateStatus.mutate");
  });

  it("has explicit loading, access, error, no-jobs, no-results, and mobile-safe states", () => {
    expect(page).toContain('aria-label="Loading job postings"');
    expect(page).toContain("Employer workspace required");
    expect(page).toContain("We couldn't load your job postings");
    expect(page).toContain("Build your team with Zylobridge");
    expect(page).toContain("No jobs match your filters");
    expect(page).toContain("overflow-x-auto");
    expect(page).toContain("w-full sm:w-auto");
  });

  it("does not hard-code job, candidate, payment, or notification data", () => {
    expect(page).not.toMatch(/12 Applicants|3 New|₦100,000|Painter|Electrician|Mason Needed/);
    expect(page).not.toContain("notificationCount =");
    expect(analytics).not.toMatch(/applicationCount:\s*12|activeEscrow:\s*100000/);
  });
});
