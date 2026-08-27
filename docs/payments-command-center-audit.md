# Earnings & Payouts Command Center Audit

## Architecture reviewed

ZYLOBRIDGE uses React 19, Vite, Tailwind, Wouter, tRPC 11, Drizzle ORM, PostgreSQL/Supabase, and authenticated server-side procedures. The existing `/payments` route is dual-purpose: professionals receive a limited informational surface, while clients, enterprise users, and administrators use it as an employer escrow/funding launcher. The employer branch must remain intact.

The authoritative professional finance model is the advanced Phase 5B finance stack, not a new payment system. It includes `engagements`, `milestones`, `payment_transactions`, `payment_events`, ledger accounts/entries, `professional_bank_accounts`, `payouts`, `refunds`, and engagement disputes. Existing `escrow_payments` remains the older employer/job escrow flow and is preserved for compatibility and application context.

## Supported states and limitations

Professional earnings can be derived only from real advanced payment transactions and payout records joined to the authenticated professional’s `payeeId`/`professionalId`. Gross amount, platform fee, currency, transaction status, milestone status, payout status, job title, employer, and dates are available. A professional bank-account record can expose payout readiness using masked fields only. Existing payout initiation is administrator-authorized; there is no safe professional self-serve withdrawal endpoint. The UI must therefore present a disabled or explanatory withdrawal state rather than simulate a successful withdrawal.

Upcoming payouts are shown only from real `payouts` records. Fees are shown only from the stored `platformFeeMinor`; no processing fee or adjustment is invented. Available balance is computed conservatively from completed payout net amounts minus any completed/processing payout records where the data contract supports it; if the available balance cannot be determined safely, the UI reports that the balance is pending calculation rather than displaying a fabricated amount. No currency conversion is performed.

## Implementation boundary

The release will add protected, ownership-scoped read procedures and a pure financial aggregation helper. It will not add redundant payment tables, alter Paystack behavior, expose full bank information, create a fake withdrawal mutation, or claim automatic payouts. The existing client/employer escrow branch and all application, job, message, notification, and authentication routes remain unchanged except for safe links into the professional financial workspace.
