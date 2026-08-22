# Zylobridge Live Notifications Implementation Report

## Executive summary

Zylobridge now has a single persisted notification feed backed by the existing `public.notifications` table, the existing tRPC notification procedures, the existing backend dispatcher, and the existing Supabase Realtime authentication bridge. New in-app notification rows are written before Realtime delivery is observed. The browser subscribes to an authenticated, private per-user channel and falls back to persisted synchronization after reconnect. The implementation is production-safe at the application-code level, but final live acceptance remains **BLOCKED** until the PostgreSQL Realtime publication and RLS migration is applied and verified against the actual production Supabase database.

## Implementation inventory

The main frontend changes are `client/src/pages/Notifications.tsx`, `client/src/hooks/useNotificationRealtime.ts`, and `client/src/components/shell/ZyloShell.tsx`. The page now supports bounded pagination, recent-first ordering, live inserts, duplicate suppression by notification ID, relative timestamps, actionable navigation, optimistic read state, mark-all-as-read, and responsive layouts. The shared shell now displays an authenticated user's unread badge on desktop and mobile navigation.

The main backend changes are `server/routers.ts` and `server/notificationDispatcher.ts`. The notification API now exposes bounded pagination and an authenticated unread-count query. Job posting, application receipt, application status changes, hiring, messages, verification decisions, role changes, and escrow lifecycle events use the canonical dispatcher. The dispatcher uses a PostgreSQL transaction advisory lock around supplied idempotency keys so concurrent retries cannot create duplicate notification records for the same event.

## Realtime and authorization

`client/src/hooks/useNotificationRealtime.ts` uses the existing `initSupabaseRealtimeAuth()` bridge, subscribes to `private-user-notifications-{userId}` with `config.private = true`, listens for committed `public.notifications` INSERT events filtered to the authenticated user, emits a synchronization event after subscription, and retries after channel errors or timeouts. The hook removes the channel when the final consumer unmounts, preventing duplicate listeners across page transitions and React lifecycle retries.

The migration `drizzle/0013_live_notifications.sql` enables RLS on `public.notifications`, grants authenticated read access, limits notification rows to the custom JWT `user_id` claim, adds a private-channel join policy on `realtime.messages`, and adds `public.notifications` to the existing `supabase_realtime` publication when necessary. It is intentionally idempotent and does not create a second notification table or a second Realtime system.

## Trusted event coverage

Message notifications exclude the sender and use `message:{messageId}` idempotency keys. Job posting uses `job-posted:{jobId}`. Application receipt uses `application-received:{applicationId}`. Application status updates use `application-status:{applicationId}:{status}`. Hiring uses `candidate-hired:{applicationId}`. Escrow initiation, funding, bank verification, and release use deterministic escrow event keys. Verification and account-role notifications are emitted from trusted backend procedures rather than client state.

## Security and privacy

All notification queries and mutations derive ownership from `ctx.user.id`. The browser rejects incoming rows whose `userId` does not match the authenticated user. Deep links carry only server-generated reference identifiers and point to existing application routes. The Realtime channel is private and user-scoped; no public notification channel is introduced. The implementation does not expose JWTs, cookies, payment details, or database credentials.

## Validation evidence

The final non-watch TypeScript validation passed. The focused notification and Realtime suites passed with **17/17 tests**. The complete suite passed with **174/174 tests across 45 files**. The production client and server build passed. The client build continues to report an existing chunk-size advisory for the main bundle; it is not a build failure. The project-level development log still contains a local CORS warning for `http://127.0.0.1:3000`, which is separate from the production notification implementation and should be resolved before relying on that local origin for browser acceptance.

## Database and production status

No production database command was executed from the sandbox. The repository migration is ready for review and must be applied through the actual production PostgreSQL/Supabase SQL path after inspecting existing `realtime.messages` policies and the `supabase_realtime` publication. The managed project SQL tool is not treated as evidence for the Railway/Supabase PostgreSQL target. Until the migration is applied and verified, live Postgres Changes delivery cannot be certified.

**IMPLEMENTATION:** PASS  
**PERSISTENCE/API:** PASS  
**AUTHORIZATION/IDOR:** PASS by code and regression coverage  
**REALTIME CODE PATH:** PASS by code and regression coverage  
**DATABASE REALTIME CONFIGURATION:** BLOCKED pending production PostgreSQL migration  
**LIVE PRODUCTION ACCEPTANCE:** BLOCKED pending authenticated multi-account event test  
**FINAL STATUS:** BLOCKED — NOT YET CERTIFIED AS LIVE IN PRODUCTION

## Operator actions required

Apply the SQL contents of `drizzle/0013_live_notifications.sql` to the actual production PostgreSQL database, then verify that the notification table RLS policy, `realtime.messages` private-channel policy, and `supabase_realtime` publication entry are present. After deployment, use two authenticated test accounts to create a message, confirm the recipient sees a new notification without refresh, verify the unread badge and read transition, test the notification deep link, and confirm the sender and a third account receive no unauthorized notification. Repeat one event after a temporary reconnect to verify persisted synchronization.
