# Zylobridge Employer Candidate-Review Navigation Report

## Summary

The employer job-management page had both actions pointing to the canonical job detail route. The **Review candidates** action therefore opened `/jobs/:id` instead of the existing employer candidate workflow. The fix is intentionally limited to that link. No database schema, migration, API procedure, or duplicate page was introduced.

## Route audit

| Action | Previous destination | Correct destination | Result |
|---|---|---|---|
| View detail | `/jobs/:id` | `/jobs/:id` | Preserved unchanged; continues to use `JobDetail.tsx`. |
| Review candidates | `/jobs/:id` | `/employer/jobs/:jobId/candidates` | Corrected to reuse `EmployerCandidates.tsx`. |

For Job 7, the corrected destination is `/employer/jobs/7/candidates`. For Job 8, it is `/employer/jobs/8/candidates`. The selected identifier remains in the route path and is parsed by the existing candidate workflow.

## Existing workflow reused

`client/src/App.tsx` already registers `/employer/jobs/:jobId/candidates` with `EmployerCandidates`. That page reads `jobId` using Wouter, applies the existing status filter, and calls `trpc.applications.listForJob.useQuery({ jobId, status })`. It displays the candidate pipeline for the selected job and provides back navigation to `/employer/jobs`.

The backend procedure in `server/routers.ts` was not changed because it already loads the requested job, verifies that the current user is the client owner, an administrator, or an authorized organization member, and rejects unauthorized access with `FORBIDDEN` before calling `getDetailedApplicationsByJobId`. Changing a job ID in the URL therefore cannot expose another employer’s applications.

## Exact files changed

| File | Change |
|---|---|
| `client/src/pages/EmployerJobs.tsx` | Changed only the Review candidates link from `/jobs/${job.id}` to `/employer/jobs/${job.id}/candidates`. |
| `server/employer-candidate-navigation.test.ts` | Added route-contract regression tests covering the corrected destination, Job 7/Job 8 ID preservation, existing route registration, back navigation, and server authorization/filtering contracts. |
| `todo.md` | Recorded and completed Phase 64 navigation-fix tasks. |
| `Zylobridge_Employer_Candidate_Review_Navigation_Report.md` | Added this implementation report. |

No backend/API or Supabase code was modified.

## Verification

The focused navigation and existing authorization tests passed: **7/7 tests** across `server/employer-candidate-navigation.test.ts` and `server/phase3.test.ts`. The complete automated suite, TypeScript validation, and production client/server build completed successfully. The build generated the existing `EmployerCandidates` route chunk and no duplicate applications or job-detail page.

The local visual route capture covered `/employer/jobs`, `/employer/jobs/7/candidates`, and `/jobs/7`. The local preview was not authenticated, so authenticated production data rendering remains dependent on the existing session and authorization flow; the route contract and protected server procedure were verified directly in source and tests.

## Final status

**Navigation fix:** PASS.

**API/schema changes:** NONE REQUIRED.

**Authorization/IDOR protection:** PRESERVED by the existing `applications.listForJob` procedure.

**View Details regression risk:** No route or component change; existing `/jobs/:id` destination preserved.
