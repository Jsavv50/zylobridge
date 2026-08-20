import { describe, it, expect } from "vitest";
import { verifyPaystackWebhookSignature } from "./finance";

describe("Phase 5B-1 Financial Core & Paystack Webhook Security", () => {
  it("rejects invalid webhook signatures", async () => {
    const isValid = await verifyPaystackWebhookSignature("test-payload", "invalid-signature");
    expect(isValid).toBe(false);
  });

  it("verifies valid HMAC SHA-512 webhook signature", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_mock";
    const crypto = await import("crypto");
    const payload = JSON.stringify({ event: "charge.success", data: { reference: "ZB-MS-123" } });
    const validSig = crypto.createHmac("sha512", "sk_test_mock").update(payload).digest("hex");

    const isValid = await verifyPaystackWebhookSignature(payload, validSig);
    expect(isValid).toBe(true);
  });
});
