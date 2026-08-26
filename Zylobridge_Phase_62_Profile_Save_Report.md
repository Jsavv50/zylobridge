# Zylobridge Phase 62 — Profile Save Production Remediation Report

## Executive result

The profile-save failure was caused by **production schema drift**: the deployed profile query selected `latitude`, `longitude`, and `serviceRadiusKm`, while the production `public.profiles` table previously lacked those columns. The application also used a select-then-update/create flow that was not a concurrency-safe idempotent upsert and did not return the saved profile consistently.

The corrected implementation is published at checkpoint `332f5779` / commit `332f57797da527d68477955b534fe59640231660`. The live browser acceptance for authenticated user `2489` succeeded: the profile editor loaded the previously failing profile query, displayed the geographic fields, submitted the existing profile values, displayed `Profile updated successfully.`, navigated to `/profile`, and retained the authenticated account after reload.

## Exact files changed in Phase 62

| File | Change |
|---|---|
| `drizzle/schema.ts` | Added canonical nullable numeric `latitude` and `longitude` fields, numeric `serviceRadiusKm` with default `50`, and the `profiles_user_id_unique` plus existing lookup index declarations. |
| `drizzle/0012_reconcile_profile_location_columns.sql` | Added an additive PostgreSQL reconciliation migration for the three location columns and the one-profile-per-user unique index. |
| `server/db.ts` | Added a server-authoritative, transaction-scoped profile upsert using the authenticated user ID, PostgreSQL advisory locking, `updatedAt` refresh, and `.returning()`. Added safe PostgreSQL diagnostic logging fields. |
| `server/routers.ts` | Restricted vocation values to the shared vocation enum, validated geographic ranges, mapped numeric inputs to Drizzle PostgreSQL numeric strings, and returned safe application errors without exposing database details. |
| `client/src/pages/EditProfile.tsx` | Added controlled latitude, longitude, and service-radius fields and safe optional numeric serialization. |
| `client/src/pages/ProfessionalDashboard.tsx` | Added the same fields to the dashboard editor, fixed asynchronous profile hydration, and preserved typed vocation submission. |
| `server/profile-upsert.test.ts` | Added five regression tests covering insert, update, repeated saves, first-save vocation requirements, optional location values, server-derived ownership, advisory locking, and migration protection. |

## Database and migration status

The version-controlled migration is `drizzle/0012_reconcile_profile_location_columns.sql`. It is additive and uses `ADD COLUMN IF NOT EXISTS`; it does not create a hard-coded profile row for user `2489`, drop data, or rewrite existing rows. The migration also creates `profiles_user_id_unique` with `IF NOT EXISTS` after the preceding production duplicate audit reported no duplicate `userId` groups.

Previous production evidence supplied during this task confirmed that the three profile columns were manually added in the Supabase PostgreSQL database and that user `2489` did not have a profile before the remediation. This session's managed SQL connection is not the Railway/Supabase PostgreSQL target, so this report does not claim that the unique index was independently applied or that PostgreSQL metadata was re-read through the managed SQL tool. The migration must still be executed through the established production PostgreSQL migration process or Supabase SQL Editor after confirming the target and absence of duplicates.

## Application behavior

The `profiles.upsert` procedure uses `protectedProcedure` and passes `ctx.user.id` directly to `upsertProfile`; it does not accept a client-supplied ownership ID. New profiles require a valid vocation. Existing profiles update by the authenticated user’s profile row. A PostgreSQL transaction advisory lock serializes concurrent saves for the same user, and the unique index is the database-level backstop against duplicate profiles. Every successful path returns the saved row and refreshes `updatedAt`.

The frontend now loads existing profile fields, supports first-time and existing-user saves, serializes omitted location fields as `undefined` rather than invalid values, and shows the success or safe backend error returned by tRPC.

## Automated validation

| Check | Result |
|---|---:|
| Focused profile suite | **5/5 passed** |
| Full Vitest suite | **155/155 passed across 40 files** |
| TypeScript validation (`pnpm check`) | **Passed** |
| Client/server production build (`pnpm build`) | **Passed** |
| Drizzle generation validation | Completed without connecting to production; repository reports legacy malformed historical snapshots for migrations 0000–0004, with no production mutation. |

## Live production evidence

The production browser session identified the authenticated account as James Witt, account ID `2489`. The production profile editor served the new Latitude, Longitude, and Service Radius fields and loaded existing profile data without the former missing-column failure. After explicit operator confirmation, saving the unchanged profile values produced the visible success message `Profile updated successfully.` and routed to `/profile`. A subsequent reload preserved the authenticated profile page. The production profile query and save path therefore have direct live UI evidence for this account.

The live test was performed against `https://zylobridge.com`. No credentials, cookies, tokens, SQL statements, database connection strings, or secret values were displayed or stored in the evidence.

## Final status

| Area | Status | Evidence boundary |
|---|---|---|
| Root-cause fix in application code | **PASS** | Published code, focused tests, full suite, typecheck, build, and live save success. |
| Authenticated server ownership | **PASS** | Protected procedure and `ctx.user.id` source contract plus live user `2489` test. |
| First-save/update/idempotency logic | **PASS** | Transactional helper and five focused tests; live existing-profile update succeeded. |
| Production location-column availability | **PASS with prior production evidence** | Profile load and save succeed live; prior operator/database evidence confirmed manual column correction. |
| Production unique-index application | **PENDING OPERATOR VERIFICATION** | Migration is committed, but this session cannot safely execute or independently verify Railway/Supabase PostgreSQL DDL. |

## Required operator follow-up

Before closing Phase 62 as fully synchronized, verify the actual Railway/Supabase PostgreSQL target and apply the committed migration using the established production process. Run a read-only duplicate check first:

```sql
SELECT "userId", COUNT(*) AS profile_count
FROM public.profiles
GROUP BY "userId"
HAVING COUNT(*) > 1;
```

If the result is empty, apply the contents of `drizzle/0012_reconcile_profile_location_columns.sql`, then verify:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('latitude', 'longitude', 'serviceRadiusKm')
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND indexname IN ('profiles_user_idx', 'profiles_user_id_unique');
```

The application remediation and live production profile-save acceptance are complete. The only remaining synchronization caveat is independently applying/verifying the unique index in the actual production PostgreSQL database.
