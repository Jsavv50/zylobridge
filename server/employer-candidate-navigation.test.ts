import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const employerJobsSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/EmployerJobs.tsx"), "utf8");
const employerCandidatesSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/EmployerCandidates.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");

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
});
