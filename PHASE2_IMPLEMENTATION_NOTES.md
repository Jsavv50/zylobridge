# Phase 2 Implementation Notes

## Repository findings

The canonical job model is `jobs` with `clientId`, `organizationId`, `projectId`, `vocation`, `status`, `budget`, `location`, `deadline`, `isUrgent`, `createdAt`, and `updatedAt`. The canonical application model uses the status values `pending`, `accepted`, `rejected`, and `withdrawn`; older analytics code referenced unsupported `shortlisted` and `hired` application states and was aligned to the current schema.

Professional public data comes from `profiles`, `professional_portfolios`, `professional_qualifications`, `professional_experiences`, `professional_verifications`, `reviews`, and completed `jobs`. Public profile queries intentionally omit private identity fields and expose only safe profile metadata. Organizations use the existing `organizations`, `organization_members`, and organization-linked `jobs` tables. Public company lookup is slug-based and only exposes active organization jobs and aggregate counts.

## Phase 2 changes

The server now exposes bounded `jobs.search`, `talent.search`, `talent.getProfile`, and `companies.getBySlug` procedures. Employer job creation returns the created job record for canonical post-publish navigation. The frontend adds canonical `/jobs`, `/jobs/new`, `/jobs/:id`, `/talent`, `/professionals/:id`, `/companies/:slug`, and `/employer/jobs` routes while retaining `/marketplace` as a compatibility alias to the canonical jobs directory.

## Compatibility finding

The existing Phase 6A notification dispatcher referenced `notification_delivery_logs`, but the current schema source lacked that export. A compatible schema export was restored using the existing migration's operational log columns. No production SQL was executed during Phase 2 implementation; any environment missing this previously planned Phase 6A table must receive its established forward-only migration through the normal deployment process.

## Validation status at note creation

`pnpm check` passes after the contract alignment. Full tests, production builds, and browser smoke checks remain required before checkpoint delivery.
