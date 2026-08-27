# Phase 93 Payment Routing and South Africa Transfer Audit

## Initial findings

The escrow Paystack flow initializes a server-side transaction in `server/routers.ts` and stores an `escrow_payments` row with a `pending` status and Paystack reference. The client currently sends `window.location.origin + "/payment/callback"` as the callback URL from `EscrowPaymentModal.tsx`, but the SPA router has no `/payment/callback` route. This explains the observed successful-payment return to the branded 404 surface: the provider redirect target is a missing frontend route, not evidence that payment failed.

The existing escrow verification mutation calls Paystack server-side, but it currently marks the escrow funded on any Paystack `success` result without checking the provider amount or currency against the stored escrow record. It also does not expose pending/failed statuses to a dedicated return page. A safe repair must preserve server-side verification, validate reference/amount/currency, and keep repeated callbacks idempotent.

The existing bank-transfer flow is not a provider-generated transfer account. It collects the payer’s bank details and returns hardcoded Zylobridge recipient instructions (`Zenith Bank`, a fixed account number, and a fixed account name). Those instructions are not an authoritative provider bank-transfer flow and must not be presented as South African support. The schema currently stores currency, bank name, payer account number/name, status, and optional proof metadata, but has no country field or provider-generated transfer-account fields.

## Provider-support decision

Official Paystack documentation states that the List Banks API accepts `nigeria`, `ghana`, `kenya`, and `south africa`, but the official Payment Channels documentation states that Pay with Bank is currently available to businesses in Nigeria and Pay with Transfer is currently available to businesses in Nigeria and Ghana only. Therefore, this codebase must not invent a South African bank-transfer list or claim that the current manual recipient flow supports South African transfer settlement. South Africa can be exposed only through a provider-authoritative payment method confirmed for the merchant account, such as a Paystack checkout channel returned/accepted by the provider; otherwise the UI must explain that a South African bank transfer is unavailable rather than offering misleading bank instructions.

## References

1. Paystack Transactions API — initialization supports a fully qualified `callback_url`, references, amount in currency subunit, and optional currency/channels: https://paystack.com/docs/api/transaction/
2. Paystack Verify Payments — callback references should be verified server-side; transaction status is `response.data.status`; webhook/verification fulfillment must avoid duplicate delivery: https://paystack.com/docs/payments/verify-payments/
3. Paystack Payment Channels — Pay with Bank is Nigeria-only and Pay with Transfer is available to businesses in Nigeria and Ghana only; channels vary by market: https://paystack.com/docs/payments/payment-channels/
4. Paystack Miscellaneous API — List Banks supports country filtering including South Africa and provider-authoritative bank metadata: https://paystack.com/docs/api/miscellaneous/

## South African EFT finding

Paystack’s official Payment Channels documentation identifies EFT as an instant bank-transfer payment method available only to South African customers. It requires the server-side Charge API with `amount`, `currency: "ZAR"`, `email`, and an `eft` object. The documentation identifies Ozow as the only currently available provider and returns a provider URL with an `open_url` status; completion is communicated through the merchant webhook via `charge.success`. This is distinct from Paystack’s Pay with Transfer flow, which is documented as Nigeria/Ghana only. The safe South Africa implementation path is therefore an authenticated server-side EFT charge using provider configuration, not a South African bank dropdown or hardcoded bank instructions.

5. Paystack Payment Channels — South African EFT is provider-backed, ZAR-denominated, available only to South African customers, currently using Ozow, and reports completion through webhooks: https://paystack.com/docs/payments/payment-channels/
