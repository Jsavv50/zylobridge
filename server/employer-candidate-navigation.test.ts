import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const employerJobsSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/EmployerJobs.tsx"), "utf8");
const employerCandidatesSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/EmployerCandidates.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");
const messagingPageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/Messaging.tsx"), "utf8");

describe("employer candidate-review navigation", () => {
  it("uses the existing job-scoped candidate workflow while keeping View detail canonical", () => {
    expect(employerJobsSource).toContain("<Link href={`/jobs/${job.id}`}><Button variant=\"outline\">View detail");
    expect(employerJobsSource).toContain("<Link href={`/employer/jobs/${job.id}/candidates`}");
    expect(employerJobsSource).not.toContain("Review candidates</Link></article>");
    expect(appSource).toContain('<Route path="/employer/jobs/:jobId/candidates" component={EmployerCandidates} />');
  });

  it("preserves the selected job ID in the destination and query input", () => {
    expect(employerCandidatesSource).toContain('useRoute("/employer/jobs/:jobId/candidates")');
    expect(employerCandidatesSource).toContain("const jobId = Number(params?.jobId ?? 0);");
    expect(employerCandidatesSource).toContain("trpc.applications.listForJob.useQuery(");
    expect(employerCandidatesSource).toContain("{ jobId, status: statusFilter }");
  });

  it("keeps employer authorization server-side before loading applications", () => {
    expect(routerSource).toContain("listForJob: protectedProcedure");
    expect(routerSource).toContain("const job = await getJobById(input.jobId);");
    expect(routerSource).toContain("if (!canManage) throw new TRPCError({ code: \"FORBIDDEN\" });");
    expect(routerSource).toContain("return getDetailedApplicationsByJobId(input.jobId, input.limit, input.offset, input.status);");
  });

  it("keeps the candidate page’s back navigation inside the employer workflow", () => {
    expect(employerCandidatesSource).toContain('setLocation("/employer/jobs")');
  });

  it("places Message directly above Review Profile and reuses the canonical conversation flow", () => {
    const messageIndex = employerCandidatesSource.indexOf(': "Message"');
    const reviewIndex = employerCandidatesSource.indexOf('Review Profile');
    expect(messageIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeGreaterThan(messageIndex);
    expect(employerCandidatesSource).toContain("trpc.messaging.getOrCreateConversation.useMutation");
    expect(employerCandidatesSource).toContain("startConversationMutation.mutate({ jobId, otherUserId: candidateId });");
    expect(employerCandidatesSource).toContain('setLocation(`/messages?conv=${conversation.id}`)');
    expect(employerCandidatesSource).toContain('candidateId === user.id');
    expect(employerCandidatesSource).toContain('candidate does not have a valid messaging identity');
    expect(messagingPageSource).toContain('new URLSearchParams(window.location.search).get("conv")');
    expect(messagingPageSource).toContain('return initialConversationId;');
  });
});
