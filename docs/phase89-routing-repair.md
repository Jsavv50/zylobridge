# Phase 89 — Production Routing Repair

## Scope

The production navigation audit covered Notifications, Escrow & Funding, and Enterprise Organization, together with their shared shell links, standalone page behavior, SPA deployment fallback, and role-sensitive access states.

## Findings

The navigation shell exposed `/notifications` and `/payments`, but `client/src/App.tsx` did not register either route. The shell also linked Enterprise Organization to `/enterprise`, while the existing implementation was registered only at `/dashboard/enterprise`. Direct navigation therefore reached the fallback surface even though the underlying enterprise workspace and escrow functionality existed elsewhere in the application.

The escrow implementation was not missing from the product. `ClientDashboard` already owns the authorized `EscrowPaymentModal`, and the server exposes protected escrow procedures for Paystack initialization, verification, bank transfer initiation, transfer-proof upload, release, refund, and job-scoped lookup. The repaired `/payments` page reconnects users to those existing employer workflows instead of duplicating payment logic or initiating charges.

Notifications were also already backed by protected procedures for unread listing, marking a notification read, and preferences. The repaired `/notifications` page uses those procedures, scopes access through the existing protected tRPC context, and provides safe links for persisted job, message, application, and enterprise references.

## Changes

`client/src/pages/Notifications.tsx` adds the protected notification surface. `client/src/pages/Payments.tsx` adds the protected escrow and payout entry surface. `client/src/App.tsx` registers `/notifications`, `/payments`, `/enterprise`, and the compatibility alias `/organization`, while preserving `/dashboard/enterprise` and all existing guards.

## Validation

Focused routing regression coverage passed. TypeScript validation passed. The complete test suite passed, followed by independent Vercel client and Railway server builds. Desktop and 390px mobile route captures rendered the affected pages without the generic 404 surface. Read-only production smoke checks returned HTTP 200 for `/notifications`, `/payments`, `/enterprise`, `/organization`, and the Railway `/api/health` endpoint.

No payment initialization, checkout, refund, payout, notification mutation, or database write was performed during acceptance.
