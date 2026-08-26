# Phase 2 Production Hardening

## Scope

This phase preserves the existing React/Vite, Express/tRPC, Drizzle/PostgreSQL, Supabase Auth/Realtime, Vercel, and Railway architecture. It does not introduce mobile code, replace authentication, or move privileged authorization into the browser.

## Query bounding and indexes

The server clamps list inputs to a maximum page size of 100 and applies limits/offsets in database helpers. The bounded procedures cover jobs, applications, messages, conversations, users, verification requests, orders, disputes, audit logs, reviews, products, and enterprise organization lists. Cursor pagination remains a future optimization for feeds with very deep offsets; the existing offset contracts were preserved to avoid a breaking API redesign.

The reviewed additive migration `drizzle/0005_phase2_query_indexes.sql` adds only query-pattern-backed indexes:

| Table | Columns | Query pattern | Expected benefit |
| --- | --- | --- | --- |
| `jobs` | `vocation, status, created_at` | Marketplace filtering and newest-first pagination | Reduces filtered sort work for the main discovery path |
| `applications` | `job_id, status` | Job-owner application review and status filtering | Reduces scans for application moderation |
| `profiles` | `vocation, is_available, created_at` | Professional discovery filters | Supports available-professional lookup |
| `conversations` | `client_id, updated_at`; `professional_id, updated_at` | Participant inbox ordering | Speeds conversation list retrieval |
| `messages` | `conversation_id, created_at` | Conversation history pagination | Supports ordered message retrieval |
| `verification_requests` | `status, created_at` | Admin verification queues | Speeds pending/ordered review lists |
| `orders` | `user_id, created_at` | User order history | Speeds user order pagination |
| `audit_logs` | `created_at` | Admin audit-log ordering | Reduces sort work on recent-log queries |

Apply the SQL only to the PostgreSQL database used by Railway after reviewing it in the deployment environment. Do not run it against a local MySQL/TiDB URL.

The additive enterprise migration `drizzle/0006_enterprise_organization_foundation.sql` creates the organization foundation and adds nullable organization/project references to `jobs`; it does not drop or rename existing columns.

## Authorization hardening

The server now validates resource ownership or participation before privileged operations. This includes escrow initialization and verification, verification-document access and review, review creation, conversation creation and message reads, enterprise membership/invitation/project operations, and enterprise-scoped job creation. Supabase RLS remains an additional data-plane control; it is not treated as a substitute for server authorization because backend service-role access can bypass RLS.

## Enterprise foundation

The organization model separates global application identity from organization membership. Membership roles are `OWNER`, `ADMIN`, `HIRING_MANAGER`, `RECRUITER`, and `MEMBER`. Invitation tokens are hashed at rest, expire, are recipient-email bound at acceptance, and are not logged. The SPA provides organization creation, member-role management, member removal, invitation cancellation, invitation acceptance, and project workspace views.

## Frontend performance

Heavy route components are now loaded through `React.lazy` and a shared `Suspense` fallback. Messaging, Admin Dashboard, Enterprise, commerce, profile, policy, verification, and marketplace routes are kept out of the initial route bundle while the public home route remains eager. No authentication or Realtime lifecycle code was rewritten.

## Observability and uptime setup

No Sentry credentials were available in this task, so no external telemetry SDK was enabled and no secrets were changed. To complete production observability, add a frontend DSN to Vercel and a backend DSN to Railway through the project secret manager, configure environment-aware filtering, and explicitly scrub OTPs, cookies, JWTs, OAuth secrets, API keys, private messages, and private documents. Establish an external uptime monitor for:

- `https://zylobridge.com`
- `https://api.zylobridge.com/api/health`

A paid monitoring account or DSN must be supplied by an operator before those integrations can be activated safely.

## Verification checklist

Run `pnpm check`, `pnpm test`, `pnpm build`, and review both SQL files before deployment. After the normal Git/CI deployment flow, verify the health endpoint and perform browser tests for Email OTP, Google OAuth, logout, refresh, role dashboards, enterprise invitation acceptance, job creation/listing, applications, messaging, Realtime, admin, and unauthorized resource access. Do not treat a passing local build as production acceptance.


## Production Database Migration Status & Operational Safeguards

The Phase 2 database migrations have been successfully finalized and applied in production. Migrations `0005_phase2_query_indexes.sql` and `0006_enterprise_organization_foundation.sql` were manually applied to the production PostgreSQL database through the Supabase SQL Editor. Migration `0005` required the creation of the missing `audit_logs` table before its indexes (`audit_logs_created_at_idx`, `audit_logs_resource_idx`) could be successfully applied. All 16 query-pattern indexes and all Enterprise organization enums (`organization_role`, `organization_member_status`, `organization_invitation_status`, `organization_project_status`), tables (`organizations`, `organization_members`, `organization_invitations`, `organization_projects`), and reference columns (`jobs.organizationId`, `jobs.projectId`) are now fully present in production.

Railway does not automatically execute `drizzle-kit migrate` during build or startup. Consequently, `__drizzle_migrations` does not contain automated historical records for these two entries because they were applied manually. This has no impact on runtime execution because the production database schema is already correct and complete. Fabricated migration history records must not be inserted, and migrations must not be re-run against production.

| Category | Status | Operational Detail |
| --- | --- | --- |
| **Schema Completeness** | Verified | All indexes, tables, enums, and foreign key columns for Phase 2 are fully active in PostgreSQL. |
| **Migration Tooling** | Unrecorded in table | `__drizzle_migrations` omits manual entries; Railway omits automated migration execution. |
| **Future Safeguards** | Enforced | Future changes must follow `drizzle-kit generate` and require prior verification of the production database state. |
