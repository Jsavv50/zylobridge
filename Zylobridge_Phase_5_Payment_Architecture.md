# Zylobridge — Phase 5 Payment Architecture Audit & Design

**Author:** Manus AI  
**Date:** August 19, 2026  
**Status:** Architecture Design Complete (Ready for Implementation Review)  

---

## 1. Executive Summary
This document defines the production-grade financial transaction, milestone funding, escrow-equivalent, payout, fee, refund, dispute, reconciliation, and webhook architecture for the Zylobridge marketplace. Built upon the established TypeScript, tRPC, PostgreSQL, and Express architecture without modifying current production operations, this design establishes an auditable, secure, and resilient financial core for Paystack integration across African currencies (NGN, ZAR, KES, GHS, USD).

---

## 2. Existing Marketplace Architecture
Zylobridge currently supports job creation, professional verification, applications, shortlisting, interview scheduling, offer management, and active engagements (`engagements` table). Phase 5 bridges signed offers to funded milestones and automated payouts.

---

## 3. Paystack Capability Analysis
- **Initialization & Verification**: Fully supported via `/transaction/initialize` and `/transaction/verify/{reference}`.
- **Transfers & Payouts**: Supported via Paystack Transfer API (`/transferrecipient` and `/transfer`), enabling automated payouts to verified professional bank accounts.
- **Webhooks**: HMAC SHA-512 signature-verified server-to-server notifications (`charge.success`, `transfer.success`, `transfer.failed`, `refund.processed`).
- **Limitations**: Paystack is a payment gateway and processor, not a licensed escrow agent. Zylobridge implements a "Managed Funds & Milestone Release" mechanism backed by explicit user agreement rather than legally regulated escrow.

---

## 4. Proposed Payment Architecture
Every financial movement flows through an immutable double-entry ledger abstraction backed by PostgreSQL transactions, ensuring strict isolation, idempotency, and non-floating-point minor-unit calculations (kobo/cents integer representation).

---

## 5. Transaction Model
```sql
-- Proposed Transaction Table
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY,
  "reference" varchar(120) NOT NULL UNIQUE,
  "engagementId" integer,
  "milestoneId" integer,
  "payerId" integer NOT NULL,
  "payeeId" integer,
  "amountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" varchar(32) NOT NULL DEFAULT 'CREATED',
  "provider" varchar(32) NOT NULL DEFAULT 'paystack',
  "providerReference" varchar(120),
  "platformFeeMinor" bigint NOT NULL DEFAULT 0,
  "metadata" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
```

---

## 6. Payment State Machine
`CREATED` → `PAYMENT_INITIATED` → `PAYMENT_PENDING` → `PAYMENT_CONFIRMED` (Funded) | `FAILED` | `EXPIRED` | `REFUNDED` | `DISPUTED`.

---

## 7. Milestone State Machine
`DRAFT` → `FUNDED` → `IN_PROGRESS` → `SUBMITTED` → `APPROVED` → `RELEASE_PENDING` → `RELEASED` | `DISPUTED` | `CANCELLED`.

---

## 8. Payout Architecture
Payouts move funds from Zylobridge holding to professional bank accounts via Paystack Transfers. Triggered only upon milestone approval and automated platform fee deduction, protected by idempotency keys and transfer verification webhooks.

---

## 9. Webhook Architecture
All webhooks are received at `/api/payments/webhook`, verifying the `x-paystack-signature` header against `PAYSTACK_SECRET_KEY`, recording raw payloads in `payment_events`, and processing idempotently.

---

## 10. Idempotency Strategy
Every transaction reference and webhook event ID is constrained with database uniqueness checks to prevent duplicate processing or double-crediting.

---

## 11. Reconciliation Strategy
Automated nightly comparison between internal ledger balances (`payment_transactions`) and Paystack settlement reports, flagging discrepancies for `SUPER_ADMIN` review.

---

## 12. Platform Fee Architecture
Configurable fee matrix supporting percentage fees (e.g. 5%–10%) and fixed transaction fees deducted automatically upon milestone release.

---

## 13. Refund Architecture
Supports full and partial refunds authorized exclusively by `SUPER_ADMIN` or automated dispute resolution outcomes.

---

## 14. Dispute Resolution
Structured dispute lifecycle (`OPENED`, `UNDER_REVIEW`, `EVIDENCE_REQUESTED`, `MEDIATION`, `RESOLVED`, `ESCALATED`, `CLOSED`) freezing milestone fund release pending admin adjudication.

---

## 15. Admin Financial Controls
Dedicated `SUPER_ADMIN` financial dashboard surfaces for transaction inspection, manual reconciliation override, dispute settlement, and payout review with mandatory audit logging.

---

## 16. Currency Architecture
Integer minor units with explicit 3-letter ISO currency codes (`NGN`, `USD`, `ZAR`, `KES`, `GHS`), supporting multi-currency deployments.

---

## 17. Security Threat Model
Mitigates payment tampering, webhook spoofing, amount/currency manipulation, and replay attacks by treating all client-submitted amounts as untrusted and re-verifying against server-side offers and milestones.

---

## 18. Failure Recovery
Robust fallback mechanisms for abandoned checkouts, failed webhooks, delayed provider responses, and interrupted database transactions.

---

## 19. Mobile API Implications
All payment initialization, verification, milestone release, and webhook endpoints are exposed via tRPC and REST APIs, ensuring seamless support for future iOS and Android clients.

---

## 20. Legal & Compliance Considerations
Zylobridge terms of service explicitly outline the managed milestone release mechanism, clarifying that Zylobridge operates as a marketplace platform facilitator rather than a licensed banking escrow institution.
