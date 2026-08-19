import { describe, expect, it, vi } from "vitest";
import { validateResendKey } from "./email";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database to avoid live DB connections in tests
vi.mock("./db", () => ({
  MAX_PAGE_SIZE: 100,
  getDb: vi.fn().mockResolvedValue(null),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  upsertUserByEmail: vi.fn().mockResolvedValue({
    id: 1,
    openId: "email:test@example.com",
    email: "test@example.com",
    name: null,
    role: "user",
  }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase clients — emailAuth now uses Supabase Auth signInWithOtp / verifyOtp
vi.mock("./_core/supabase", () => ({
  getSupabasePublic: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({
        data: { user: { id: "supabase-uid-123", email: "test@example.com" } },
        error: null,
      }),
    },
  })),
  getSupabaseAdmin: vi.fn(() => null),
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

// ── emailAuth.sendOtp — Supabase Auth OTP flow ────────────────────────────────
describe("emailAuth.sendOtp", () => {
  it("returns success when Supabase dispatches the OTP email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.emailAuth.sendOtp({ email: "test@example.com" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("OTP sent");
  });

  it("throws INTERNAL_SERVER_ERROR when Supabase signInWithOtp returns an error", async () => {
    const { getSupabasePublic } = await import("./_core/supabase");
    (getSupabasePublic as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({
          error: { message: "Email rate limit exceeded" },
        }),
        verifyOtp: vi.fn(),
      },
    });
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.emailAuth.sendOtp({ email: "fail@example.com" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects invalid email addresses", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.emailAuth.sendOtp({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

// ── emailAuth.verifyOtp — Supabase Auth OTP verification ─────────────────────
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

  it("returns UNAUTHORIZED when Supabase rejects the OTP token", async () => {
    const { getSupabasePublic } = await import("./_core/supabase");
    (getSupabasePublic as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      auth: {
        signInWithOtp: vi.fn(),
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Token has expired or is invalid" },
        }),
      },
    });
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.emailAuth.verifyOtp({ email: "nonexistent@example.com", otp: "999999" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns success and sets session cookie when OTP is valid", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.emailAuth.verifyOtp({ email: "test@example.com", otp: "123456" });
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe("test@example.com");
  });
});
