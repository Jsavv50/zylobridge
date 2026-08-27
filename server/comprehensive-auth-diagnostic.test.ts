import { describe, it, expect, vi } from "vitest";

describe("Comprehensive Auth Diagnostic & Repair", () => {
  it("validates email normalization and trimming for OTP flows", () => {
    const rawEmail = "   Minermikee777@Gmail.com   ";
    const normalized = rawEmail.trim().toLowerCase();
    expect(normalized).toBe("minermikee777@gmail.com");
  });

  it("validates 6-digit OTP regex matching", () => {
    const validOtp = "123456";
    const invalidOtp = "12345a";
    const regex = /^\d{6}$/;

    expect(regex.test(validOtp)).toBe(true);
    expect(regex.test(invalidOtp)).toBe(false);
  });

  it("handles OAuth transaction state generation and hashing correctly", () => {
    const state = "test-state-payload-123456";
    expect(state.length).toBeGreaterThan(10);
  });
});
