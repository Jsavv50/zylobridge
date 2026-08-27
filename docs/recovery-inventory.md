# Recovery and Reconciliation Inventory

## Production Supabase source

The connected production project is `Zylobridge-db` (`ztasdzkunkhfrnxmnmzq`), hosted in `eu-west-1`, and reported `ACTIVE_HEALTHY` by the Supabase project listing.

The production top-level public tables reported by Supabase are: `__drizzle_migrations`, `applications`, `audit_logs`, `conversations`, `email_otps`, `escrow_payments`, `jobs`, `messages`, `notifications`, `orders`, `organization_invitations`, `organization_members`, `organization_projects`, `organization_verification_requests`, `organization_workforce_assignments`, `organizations`, `phone_otps`, `products`, `profiles`, `reviews`, `users`, and `verification_requests`.

The repository Drizzle schema additionally declares operational and financial tables not present in the top-level production table inventory: `background_jobs` (defined locally in `server/backgroundJobs.ts`), `dispute_evidence`, `disputes`, `engagement_disputes`, `engagements`, `interviews`, `ledger_accounts`, `ledger_entries`, `matching_scores`, `milestones`, `notification_delivery_logs`, `notification_preferences`, `oauth_transactions`, `offers`, `payment_events`, `payment_transactions`, `payouts`, `professional_bank_accounts`, `professional_experiences`, `professional_portfolios`, `professional_qualifications`, `professional_verifications`, `push_subscriptions`, `reconciliation_records`, `refunds`, `reminders`, and `shortlists`.

Production enum inspection found a naming hazard: `public.job_status` already represents marketplace job states (`open`, `in_progress`, `completed`, `cancelled`, `draft`, `paused`, `closed`), while `drizzle/0010_phase6a_platform_operations.sql` attempts to create another `job_status` enum for background-job states. That migration must not be applied unchanged. The repository’s background queue currently defines its own `status` as varchar, so the safe reconciliation path is to preserve the existing marketplace enum and create a distinct background-job status type or retain varchar.

Production enum values also show that the database contains newer organization role values (`PROJECT_MANAGER`, `FINANCE_MANAGER`, `VIEWER`) and a `workforce_assignment_status` enum, indicating manually applied or separately tracked enterprise reconciliation work beyond the older Drizzle journal.

Supabase migration listing reports one production migration named `enterprise_reconciliation` (`20260826052339`). The repository Drizzle journal still contains only the initial MySQL/TiDB entries `0000_fancy_shape` through `0004_graceful_turbo`; later PostgreSQL migrations are separate SQL files and are not represented in that journal. This is migration-history drift, not evidence that all later objects are absent.

Supabase advisors reported informational RLS-no-policy findings for several public tables, and performance findings for unindexed foreign keys and RLS policies using per-row `auth` evaluation. These require policy review before remediation; no destructive changes are justified from these advisories alone.

## Source and deployment comparison

GitHub currently exposes only `main` as a remote branch; no remote-only branches, open pull requests, or unmerged commits were found. The recovery branch was created from the current restored state and preserved as commit `0e95dc7`. The current source differs from the earlier launch checkpoint `7955248` only by the recent launch documentation, the normalized Super Admin email lookup, its regression test, and TODO tracking. The current launch-ready application features are therefore already present in source; the meaningful remaining drift is primarily database migration tracking and production schema coverage.

The live Vercel frontend returned HTTP 200, and the live Railway API returned a healthy JSON response from `/api/health`. `vercel.json` builds and serves `dist/public`; `railway.json` builds the Node server with `build:server`, starts with `pnpm start`, and uses `/api/health` as its health check.

## Safe next action

Prepare a non-destructive, dependency-ordered reconciliation migration only after reviewing each missing table against its production counterpart and resolving the `job_status` naming collision. Do not drop tables, recreate enums, reset the production database, or apply the unmodified Phase 6A SQL.

## Reconciliation applied

The reviewed migration `drizzle/0011_recovery_reconciliation.sql` was applied successfully to production project `ztasdzkunkhfrnxmnmzq`. It created the missing professional, hiring, intelligence, financial, dispute, OAuth persistence, notification delivery, and background queue tables using additive `CREATE TABLE IF NOT EXISTS` operations and indexes. It did not drop or reset data. It intentionally did not create a second `job_status` enum because production already uses that name for marketplace job status; the background queue uses varchar status consistently with `server/backgroundJobs.ts`.

Post-migration Supabase inventory confirms the new objects exist with zero rows, while existing production data remains present in users, profiles, jobs, applications, conversations, messages, escrow, verification, enterprise, and audit tables. The production project remains healthy.

## Runtime repair

The development server previously registered the API diagnostic `/` route before Vite, causing the local preview to return API JSON instead of the React application. The route is now production-only. The CORS policy also now permits loopback origins only outside production, including the managed `http://127.0.0.1:3000` preview origin, while preserving the explicit production allowlist. Focused regression coverage and the complete suite pass.

## Validation

TypeScript validation passed. The complete Vitest suite passed with 40 test files and 150 tests. The Vite client build and esbuild server build passed. The local preview returned React HTML with the `ZYLOBRIDGE` title, the live Vercel root returned HTTP 200, Railway `/api/health` returned healthy JSON, and Railway Google OAuth initiation returned HTTP 302 to Google with the expected callback URL. The known non-blocking Vite warning remains a 657 kB main chunk; no custom manual chunking was reintroduced because the prior blank-screen incident showed that unsafe chunk partitioning can break production initialization.
