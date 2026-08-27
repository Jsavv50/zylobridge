import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("payment routing and country-aware provider configuration", () => {
  it("registers a real frontend callback route for Paystack returns", () => {
    const app = read("client/src/App.tsx");
    const callbackPage = read("client/src/pages/PaymentCallback.tsx");
    expect(app).toContain('const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));');
    expect(app).toContain('<Route path="/payment/callback" component={PaymentCallback} />');
    expect(callbackPage).toContain("trpc.escrow.verifyPaystack.useMutation");
    expect(callbackPage).toContain("Payment not confirmed");
  });

  it("keeps payment success dependent on server verification and amount/currency matching", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('callback_url: `${getFrontendUrl()}/payment/callback`');
    expect(routers).toContain('if (result.reference !== input.reference)');
    expect(routers).toContain('result.amount !== expectedAmountMinor || result.currency !== escrow.currency');
    expect(routers).toContain('if (result.status !== "success")');
  });

  it("uses Paystack's documented South African EFT provider without inventing bank instructions", () => {
    const paystack = read("server/paystack.ts");
    const modal = read("client/src/components/EscrowPaymentModal.tsx");
    expect(paystack).toContain('"/charge"');
    expect(paystack).toContain('currency: "ZAR"');
    expect(paystack).toContain('eft: { provider: "ozow" }');
    expect(modal).toContain("South African EFT");
    expect(modal).toContain("No local bank account details are collected or hardcoded here.");
    expect(modal).toContain('method === "bank_transfer" ? handleBankTransferInit : handlePaystackInit');
  });

  it("reuses pending provider transactions to prevent duplicate escrow initiation", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('existing?.status === "pending"');
    expect(routers).toContain('existing.paystackReference && existing.paystackAuthorizationUrl');
    expect(routers).toContain('existing.currency === "ZAR"');
  });

  it("captures the raw webhook body before JSON parsing and preserves signature verification", () => {
    const index = read("server/_core/index.ts");
    const webhook = read("server/webhook.ts");
    expect(index).toContain('originalUrl === "/api/payments/webhook"');
    expect(index).toContain("rawBody");
    expect(webhook).toContain("rawBody");
    expect(webhook).toContain("verifyPaystackWebhookSignature(rawBodyString, signature)");
  });

  it("keeps Nigeria bank listing and manual transfer controls scoped to Nigeria", () => {
    const modal = read("client/src/components/EscrowPaymentModal.tsx");
    const routers = read("server/routers.ts");
    expect(routers).toContain('return listPaystackBanks("nigeria")');
    expect(modal).toContain('country === "nigeria" && method === "bank_transfer"');
    expect(modal).toContain('method === "bank_transfer" && country === "nigeria"');
  });
});
