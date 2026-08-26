# Zylobridge — Phase 5 Payment & Milestone State Machines

**Author:** Manus AI  
**Date:** August 19, 2026  

---

## 1. Payment Transaction State Transition Table

| Current State | Event / Trigger | Target State | Authorized Actor / System | Validation & Safeguards |
| :--- | :--- | :--- | :--- | :--- |
| **CREATED** | Checkout initialized | **PAYMENT_INITIATED** | Employer / Client | Server calculates exact minor units |
| **PAYMENT_INITIATED** | Gateway redirect / popup | **PAYMENT_PENDING** | Paystack Gateway | Reference stored idempotently |
| **PAYMENT_PENDING** | Webhook: `charge.success` | **PAYMENT_CONFIRMED** | Paystack Webhook / Server | HMAC signature verified, amount matches |
| **PAYMENT_PENDING** | Webhook: `charge.failed` | **FAILED** | Paystack Webhook | Logged for retry / notification |
| **PAYMENT_CONFIRMED** | Milestone funding linked | **FUNDED** | System | Funds escrowed in platform holding |
| **PAYMENT_CONFIRMED** | Refund requested & approved | **REFUND_PENDING** | SUPER_ADMIN | Requires valid dispute/cancellation reason |
| **REFUND_PENDING** | Paystack refund API success | **REFUNDED** | Paystack API / Server | Transaction status locked |
| **PAYMENT_CONFIRMED** | Dispute opened | **DISPUTED** | Employer / Professional | Milestone funds frozen |

---

## 2. Milestone State Transition Table

| Current State | Event / Trigger | Target State | Authorized Actor / System | Validation & Safeguards |
| :--- | :--- | :--- | :--- | :--- |
| **DRAFT** | Engagement signed & milestone created | **FUNDED** | Employer (via Payment) | Payment confirmed by gateway webhook |
| **FUNDED** | Work commenced by professional | **IN_PROGRESS** | Professional | Start date reached |
| **IN_PROGRESS** | Deliverables submitted | **SUBMITTED** | Professional | Submission artifact attached |
| **SUBMITTED** | Employer approves work | **APPROVED** | Employer | Triggers release preparation |
| **APPROVED** | Platform fee deducted & payout queued | **RELEASE_PENDING** | System | Automatic transfer dispatch |
| **RELEASE_PENDING** | Payout completed successfully | **RELEASED** | Paystack Transfer | Professional balance credited |
| **IN_PROGRESS / SUBMITTED** | Dispute raised by either party | **DISPUTED** | Employer / Professional | Funds locked pending admin review |
| **DRAFT / FUNDED** | Mutual cancellation | **CANCELLED** | Employer & Professional | Refund triggered if funded |

---

## 3. Payout State Transition Table

| Current State | Event / Trigger | Target State | Authorized Actor / System | Validation & Safeguards |
| :--- | :--- | :--- | :--- | :--- |
| **PENDING** | Milestone approved & fee deducted | **PAYOUT_INITIATED** | System | Recipient bank code verified via Paystack |
| **PAYOUT_INITIATED** | Transfer API request sent | **PAYOUT_PROCESSING** | Paystack Gateway | Idempotency transfer reference included |
| **PAYOUT_PROCESSING** | Webhook: `transfer.success` | **PAYOUT_COMPLETED** | Paystack Webhook | Signature verified & reconciled |
| **PAYOUT_PROCESSING** | Webhook: `transfer.failed` | **PAYOUT_FAILED** | Paystack Webhook | Logged for manual admin intervention |
| **PAYOUT_FAILED** | Admin retry or account fix | **PAYOUT_INITIATED** | SUPER_ADMIN | Requires verified bank details update |
