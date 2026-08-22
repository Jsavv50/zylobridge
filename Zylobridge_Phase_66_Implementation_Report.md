# Zylobridge Phase 66 Implementation Report

## Executive summary

Phase 66 hardens the employer candidate pipeline around the existing application, payment, Supabase Realtime, and Notifications architecture. Candidate actions are now status-aware, escrow funding is restricted to accepted applications and uses the persisted bid amount as the server authority, the browser Realtime bridge has the same production API fallback as the main tRPC client, and lifecycle events are routed through the canonical persisted notification dispatcher.

The implementation does not introduce a second messaging system, a second payment UI, a public Realtime channel, a new database table, or a schema migration. The existing `EscrowPaymentModal`, `messaging.getOrCreateConversation`, `applications.updateStatus`, and `notifications` table remain the canonical workflows.

## Implementation inventory

| Area | Implementation | Key files |
|---|---|---|
| Candidate actions | `Message` and `Fund Escrow` render only when an application is `accepted`; `Review Profile` remains available for every card. | `client/src/pages/EmployerCandidates.tsx` |
| Messaging authorization | Rejected applicants cannot open candidate-pipeline conversations; employer and professional membership checks remain server-side. | `server/routers.ts` |
| Escrow authorization | Every funding path requires a matching accepted application. Existing pending, funded, or released escrow records are not duplicated. | `server/routers.ts` |
| Escrow amount integrity | Paystack and bank-transfer initialization use the accepted application `bidAmount`, not a client-controlled amount. Paystack verification also compares provider amount with the persisted escrow amount. | `server/routers.ts` |
| Escrow UX | Candidate pipeline reuses the existing responsive `EscrowPaymentModal`, including Paystack, bank transfer, proof upload, loading, error, and funded-state handling. | `client/src/pages/EmployerCandidates.tsx`, `client/src/components/EscrowPaymentModal.tsx` |
| Realtime bridge | The browser token request uses `VITE_API_URL` and falls back to `https://api.zylobridge.com` in production, with credentials included; the backend token now includes an explicit issued-at claim for Supabase compatibility. | `client/src/lib/supabase.ts`, `server/_core/realtimeAuth.ts` |
| Notifications | Message, application-status, escrow-initiation, escrow-funding, escrow-release, verification, and role-change events use the canonical dispatcher with idempotency keys. | `server/routers.ts`, `server/notificationDispatcher.ts` |
| Notification navigation | Conversation, job, escrow, and verification notifications preserve reference metadata and navigate to existing routes. | `client/src/pages/Notifications.tsx`, `drizzle/schema.ts` |

## Security and authorization

The candidate pipeline uses the existing `applications.listForJob` authorization path. Only the job owner, authorized administrators, or permitted organization roles can load a job's applications. Messaging still requires job participation and conversation membership. Rejected applicants are blocked for both professional-initiated and employer-initiated candidate-pipeline conversations.

Escrow funding requires a server-resolved job and an associated accepted application. The server derives the amount from `applications.bidAmount`, rejects invalid values, blocks active duplicate escrow records, and verifies Paystack's returned amount before marking an escrow funded. No payment was initiated during validation.

## Validation evidence

The full automated suite passed: **43 test files and 169 tests**. TypeScript validation passed with `pnpm check`. The production client and server build passed with `pnpm build`. The focused Phase 66 and related regression suites passed with **6 test files and 23 tests**. The public Supabase settings endpoint validation passed without printing the anonymous key.

The client build remains route-chunked. Vite reports an existing advisory that the main application chunk is larger than 500 kB; this is a performance warning, not a build failure. The local development server reports that `SUPABASE_JWT_SECRET` is not configured in the sandbox runtime, so private Realtime authentication cannot be exercised locally without the production secret. The production secret must remain configured in the Railway backend as it was for the existing Realtime bridge.

Desktop and mobile preview captures completed for `/employer/jobs/1/candidates`, `/notifications`, and `/messages`. The unauthenticated preview renders the route shell/redirect behavior rather than candidate data. An authenticated production browser acceptance requires an operator session and must not initiate a real payment; the safe acceptance path is to verify action visibility and open the escrow modal without submitting a transaction.

## Changed files

- `client/src/lib/supabase.ts`
- `client/src/pages/EmployerCandidates.tsx`
- `client/src/pages/Notifications.tsx`
- `server/notificationDispatcher.ts`
- `server/routers.ts`
- `server/phase66.test.ts`
- `server/supabase-public-config.test.ts`
- `todo.md`

## Production acceptance checklist

The release is ready for checkpoint publication after final diff review. After publication, an authenticated employer should verify that a pending or rejected application exposes only `Review Profile`, while an accepted application exposes `Message` and `Fund Escrow`. The operator should open, but not submit, the escrow modal; verify the Message action opens `/messages?conv={id}`; send a non-financial test message; and confirm the recipient receives one persisted unread notification that navigates to the same conversation.

Live production verification confirmed that `GET https://api.zylobridge.com/api/realtime/token` returns HTTP 200 with an authenticated token for the signed-in session, and the deployed bundle contains both the compiled Supabase project URL and the Railway API fallback. The active route remained `private-conversation-{conversationId}` in source. However, the authenticated browser still displayed `Connection error` after subscription, so the exact Supabase channel authorization result remains unresolved and Phase 66 Realtime production acceptance is not certified. The local sandbox also lacks `SUPABASE_JWT_SECRET`, preventing local private-channel verification.

## Status

**Implementation:** PASS  
**Authorization hardening:** PASS  
**Automated tests:** PASS — 169/169  
**TypeScript:** PASS  
**Production builds:** PASS  
**Production payment acceptance:** NOT PERFORMED — intentionally blocked to avoid a real charge  
**Production private Realtime acceptance:** BLOCKED — token endpoint succeeds, but the authenticated live channel still transitions to `Connection error`; Railway/Supabase channel authorization logs or policy verification are required before claiming resolution
