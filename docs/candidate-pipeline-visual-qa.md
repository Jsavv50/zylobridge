# Candidate Pipeline visual and runtime QA

## Preview verification

The job-scoped route `/employer/jobs/3/candidates` resolves through the production application router. In the unauthenticated preview session, it renders the branded employer shell and the explicit **Hiring account required** state with a sign-in action; it does not disclose job or candidate data.

At the 390 × 844 mobile viewport, the route remains horizontally contained, the compact navigation is preserved, and the initial loading skeleton stacks into touch-friendly full-width cards. Because the preview session is unauthenticated, populated candidate cards, filters, comparison, action dialogs, and lifecycle controls require authenticated production verification with a hiring account.

## Automated coverage

The focused Candidate Pipeline suite validates route registration, deterministic lifecycle mapping, ownership and organization-role guards, server-side filters and pagination, real-data profile enrichment, shortlist/interview/offer/hire preconditions, idempotent engagement creation, notifications, audit records, comparison, mobile filters, and honest empty/error states.

## Authoritative data compatibility

A bounded, read-only query against the authoritative Supabase project verified that the existing `jobs`, `applications`, `shortlists`, `interviews`, `offers`, and `engagements` tables support the Candidate Pipeline joins. Five recorded jobs currently have one application each; the sampled records have no persisted shortlist, interview, offer, or engagement relationships yet. This confirms that the new interface must show truthful **New applicant** and empty downstream-stage states rather than fabricated pipeline activity. No schema migration or production data mutation was required.
