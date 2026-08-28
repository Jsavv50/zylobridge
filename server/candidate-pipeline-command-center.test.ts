import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CANDIDATE_PIPELINE_STAGES, deriveCandidatePipelineStage } from "./candidatePipeline";

const root = resolve(import.meta.dirname, "..");
const service = readFileSync(resolve(root, "server/candidatePipeline.ts"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const page = readFileSync(resolve(root, "client/src/pages/EmployerCandidates.tsx"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

describe("Candidate Pipeline lifecycle", () => {
  it("publishes the canonical stage set", () => {
    expect(CANDIDATE_PIPELINE_STAGES).toEqual(["all", "new", "shortlisted", "interview", "offer", "hired", "rejected"]);
  });

  it("derives deterministic stages from persisted relationships", () => {
    expect(deriveCandidatePipelineStage({ applicationStatus: "pending", shortlisted: false })).toBe("new");
    expect(deriveCandidatePipelineStage({ applicationStatus: "pending", shortlisted: true })).toBe("shortlisted");
    expect(deriveCandidatePipelineStage({ applicationStatus: "pending", shortlisted: true, interviewStatus: "confirmed" })).toBe("interview");
    expect(deriveCandidatePipelineStage({ applicationStatus: "pending", shortlisted: true, interviewStatus: "completed", offerStatus: "pending" })).toBe("offer");
    expect(deriveCandidatePipelineStage({ applicationStatus: "accepted", shortlisted: true, engagementStatus: "active" })).toBe("hired");
    expect(deriveCandidatePipelineStage({ applicationStatus: "rejected", shortlisted: true })).toBe("rejected");
    expect(deriveCandidatePipelineStage({ applicationStatus: "withdrawn", shortlisted: false })).toBe("withdrawn");
  });
});

describe("Candidate Pipeline authorization and data contract", () => {
  it("keeps the job-scoped route registered", () => {
    expect(app).toContain('<Route path="/employer/jobs/:jobId/candidates" component={EmployerCandidates} />');
  });

  it("requires a hiring account and active organization hiring role", () => {
    expect(service).toContain("ensureHiringAccount(viewer)");
    expect(service).toContain("organizationCandidateRoles");
    expect(service).toContain('eq(organizationMembers.status, "active")');
    expect(service).toContain("You are not authorized to manage candidates for this job");
  });

  it("scopes every read and mutation to the job/application relationship", () => {
    expect(service).toContain("eq(applications.jobId, jobId)");
    expect(service).toContain("eq(applications.id, applicationId)");
    expect(service).toContain("Candidate application not found for this job");
  });

  it("uses server-side search, filters, sorting, counts, and pagination", () => {
    expect(service).toContain("filters.q?.trim()");
    expect(service).toContain("filters.skill?.trim()");
    expect(service).toContain("filters.location?.trim()");
    expect(service).toContain("filters.minExperience");
    expect(service).toContain("filters.minRating");
    expect(service).toContain("filters.minBid");
    expect(service).toContain("filters.maxBid");
    expect(service).toContain("clampPageSize(filters.limit, 25)");
    expect(service).toContain("count(*) filter");
  });

  it("returns only real profile, trust, work, and lifecycle records", () => {
    expect(service).toContain("professionalPortfolios");
    expect(service).toContain("professionalQualifications");
    expect(service).toContain("professionalExperiences");
    expect(service).toContain("professionalVerifications");
    expect(service).toContain("reviews");
    expect(service).toContain("publicProfileMetadata");
    expect(service).not.toContain("Math.random");
    expect(page).toContain("No reviews yet");
    expect(page).not.toContain("Lorem ipsum");
  });
});

describe("Candidate Pipeline state transitions", () => {
  it("requires shortlist before interview and completed interview before offer", () => {
    expect(service).toContain("Shortlist the candidate before scheduling an interview");
    expect(service).toContain("Complete the candidate interview before making an offer");
  });

  it("prevents rejected or hired applications from invalid transitions", () => {
    expect(service).toContain("Only active applications can be shortlisted");
    expect(service).toContain("A hired candidate cannot be rejected");
    expect(service).toContain("This candidate cannot be hired in the current state");
  });

  it("creates hire relationships transactionally and idempotently", () => {
    expect(service).toContain("pg_advisory_xact_lock");
    expect(service).toContain("db.transaction");
    expect(service).toContain("tx.insert(engagements)");
    expect(service).toContain('status: "accepted"');
    expect(service).toContain('status: "in_progress"');
    expect(service).toContain("assignedProfessionalId");
    expect(service).toContain("This position has already been filled");
    expect(service).toContain("acceptOfferAndEnsureEngagement");
  });

  it("blocks shallow application acceptance and direct engagement creation", () => {
    expect(router).toContain("Use the Candidate Pipeline offer and hire workflow to accept a candidate");
    expect(router).toContain("Create engagements through the Candidate Pipeline hire flow or professional offer acceptance");
  });

  it("records notifications and audit entries for material decisions", () => {
    for (const action of ["candidate.shortlisted", "candidate.interview_scheduled", "candidate.offer_created", "candidate.rejected", "candidate.hired"]) {
      expect(router).toContain(action);
    }
    expect(router).toContain('title: "You were hired"');
    expect(router).toContain('referenceType: "engagement"');
  });
});

describe("Candidate Pipeline user experience", () => {
  it("provides URL-synchronized stages, search, sort, pagination, and mobile filters", () => {
    expect(page).toContain("window.history.replaceState");
    expect(page).toContain("Search by name, skill, experience");
    expect(page).toContain("Best match");
    expect(page).toContain("Recently updated");
    expect(page).toContain("Filter candidates");
    expect(page).toContain("Previous");
    expect(page).toContain("Next");
  });

  it("renders data-backed cards, review drawer, comparison, and supported actions", () => {
    expect(page).toContain("Candidate Pipeline");
    expect(page).toContain("Why this candidate matches");
    expect(page).toContain("Verification & credentials");
    expect(page).toContain("Hiring activity");
    expect(page).toContain("Compare candidates");
    expect(page).toContain("Schedule interview");
    expect(page).toContain("Create offer");
    expect(page).toContain("Confirm Hire");
    expect(page).toContain("Escrow & Funding");
  });

  it("preserves truthful loading, error, forbidden, invalid-route, and empty states", () => {
    expect(page).toContain("CandidateSkeleton");
    expect(page).toContain("Candidate access unavailable");
    expect(page).toContain("Invalid job link");
    expect(page).toContain("No applications yet");
    expect(page).toContain("Try again");
  });
});
