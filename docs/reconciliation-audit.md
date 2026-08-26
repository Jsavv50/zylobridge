# Zylobridge Restoration Reconciliation — Working Audit

**Audit date:** 2026-08-26  
**Scope:** Restored repository, Git history, Vercel/Railway configuration, live Supabase schema, Supabase security advisors, and non-invasive live endpoints.

## Verified Current Baseline

The restored repository is at `origin/main` commit `ea10e1e`, with no recoverable dangling commits or alternate remote branches. Type checking, the 42-test Vitest suite, the Vite frontend build, and the Express backend build all completed successfully. The Vercel configuration builds only `dist/public`, while Railway builds and starts only the API server. The live frontend and the API health endpoint both responded successfully during the audit.

## Recovered-Environment Drift

The live Supabase project has materially newer structures than the restored source. It contains organization, organization membership, invitation, organization project, audit-log, and notification tables; extended profile/job geo fields; optional `jobs.organizationId` and `jobs.projectId`; and an `enterprise` user type. None of these structures are represented in the restored Drizzle schema or implemented in the data-access, router, or client layers. The live database also contains `SUPER_ADMIN` as a role value while the restored source expects `super_admin`, which makes role recognition inconsistent.

The production schema has no recorded Supabase migrations and its `__drizzle_migrations` table is empty. Existing repository SQL migrations predate the PostgreSQL migration, and `drizzle/supabase_migration.sql` lacks both the recovered enterprise structures and the current production additions. Schema reconciliation must therefore be performed through new additive, idempotent PostgreSQL migrations that preserve all existing data.

## Critical Risks Requiring Remediation

The backend uses server-side credentials, so application-layer authorization is the primary boundary. The restored router currently permits reading messages without confirming conversation membership, permits payment verification without confirming record ownership, and allows a user to establish conversations beyond the intended job relationship. The Socket.IO server uses `origin: "*"` with credentials and allows `mark_read` without first verifying the caller is a conversation participant. The public storage proxy issues signed downloads for arbitrary keys, exposing verification and transfer-proof records when their storage URL is known. The legacy phone OTP flow logs OTP values and is not suitable for production release.

The live Supabase security advisor confirms that RLS is enabled but policies are absent for most application tables, including organization and payment data. This leaves the REST API deny-by-default rather than directly accessible, which is protective only while no direct client data access is introduced. The `public.rls_auto_enable()` security-definer function remains executable by `anon` and `authenticated` roles and must be revoked. The production code and live home page also include unsupported claims and fabricated-looking testimonials, ratings, review counts, and customer identities; these must be removed before launch certification.

## Reconciliation Direction

The implementation will preserve the live organization and notification tables, add missing source models and secure router access around them, extend them only through additive migrations, restore enterprise onboarding and dashboards, and centralize expanded vocations in one browser-safe source. Existing client and professional workflows will remain supported while enterprise users gain scoped access through organization membership roles.
