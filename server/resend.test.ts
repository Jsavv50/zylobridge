import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { validateResendKey } from "./email";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database to avoid live DB connections in tests
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  createEmailOtp: vi.fn().mockResolvedValue(undefined),
  getLatestEmailOtp: vi.fn().mockResolvedValue(null),
  incrementEmailOtpAttempts: vi.fn().mockResolvedValue(undefined),
  markEmailOtpVerified: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  upsertUserByEmail: vi.fn().mockResolvedValue({ id: 1, openId: "email:test@example.com" }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ── Resend API key validation ──────────────────────────────────────────────────

describe("Resend email service — API key validation", () => {
  it("RESEND_API_KEY is set in environment", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(typeof process.env.RESEND_API_KEY).toBe("string");
    expect(process.env.RESEND_API_KEY!.length).toBeGreaterThan(10);
  });

  it("Resend API key is valid (send-only key is accepted)", async () => {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Test] RESEND_API_KEY not set — skipping live validation");
      return;
    }
    const isValid = await validateResendKey();
    expect(isValid).toBe(true);
  }, 15_000);
});

// ── emailAuth.sendOtp — mocked Resend delivery ────────────────────────────────

describe("emailAuth.sendOtp", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success when Resend delivers the email", async () => {
    // Mock the email module so no real email is sent
    vi.doMock("./email", () => ({
      sendOtpEmail: vi.fn().mockResolvedValue(true),
    }));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailAuth.sendOtp({ email: "test@example.com" });

    expect(result.success).toBe(true);
    expect(result.message).toContain("OTP sent");
  });

  it("throws INTERNAL_SERVER_ERROR when Resend delivery fails", async () => {
    // Mock the email module to simulate a delivery failure
    vi.doMock("./email", () => ({
      sendOtpEmail: vi.fn().mockRejectedValue(new Error("Resend network error")),
    }));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.sendOtp({ email: "fail@example.com" })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("rejects invalid email addresses", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.sendOtp({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

// ── emailAuth.verifyOtp — OTP validation logic ────────────────────────────────

describe("emailAuth.verifyOtp", () => {
  it("rejects a 5-digit OTP (must be exactly 6 digits)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.verifyOtp({ email: "test@example.com", otp: "12345" })
    ).rejects.toThrow();
  });

  it("rejects a non-numeric OTP", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.verifyOtp({ email: "test@example.com", otp: "abcdef" })
    ).rejects.toThrow();
  });

  it("returns NOT_FOUND when no OTP record exists for the email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.verifyOtp({ email: "nonexistent@example.com", otp: "999999" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
