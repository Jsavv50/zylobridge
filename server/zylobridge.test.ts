import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { vi } from "vitest";

// Mock Paystack to avoid live HTTP calls in tests
vi.mock("./paystack", () => ({
  listPaystackBanks: vi.fn().mockResolvedValue([{ id: 1, name: "Zenith Bank", code: "057", slug: "zenith-bank", longcode: "057150013", gateway: null, pay_with_bank: false, active: true, country: "Nigeria", currency: "NGN", type: "nuban", is_deleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]),
  initializePaystackTransaction: vi.fn().mockResolvedValue({ authorization_url: "https://paystack.com/pay/test", access_code: "test-access", reference: "test-ref-001" }),
  verifyPaystackTransaction: vi.fn().mockResolvedValue({ status: "success", amount: 500000, reference: "test-ref-001", paid_at: new Date().toISOString() }),
  resolveAccountNumber: vi.fn().mockResolvedValue({ account_name: "Test User", account_number: "0123456789" }),
  generatePaystackReference: vi.fn().mockReturnValue("ZB-test-001"),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@zylobridge.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    userType: "unset",
    isVerified: false,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createAdminCtx() {
  return createCtx({ id: 99, openId: "admin-001", role: "admin", userType: "client" });
}

function createClientCtx() {
  return createCtx({ id: 2, openId: "client-001", role: "user", userType: "client" });
}

function createProfessionalCtx() {
  return createCtx({ id: 3, openId: "pro-001", role: "user", userType: "professional" });
}

function createUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ── Auth tests ─────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true });
  });

  it("auth.me returns null for unauthenticated user", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const { ctx } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@zylobridge.com");
  });
});

// ── RBAC tests ─────────────────────────────────────────────────────────────────

describe("admin RBAC", () => {
  it("blocks non-admin from admin.stats", async () => {
    const { ctx } = createCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin from admin.listUsers", async () => {
    const { ctx } = createCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listUsers({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin from admin.deleteJob", async () => {
    const { ctx } = createCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.deleteJob({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin from admin.updateUserRole", async () => {
    const { ctx } = createCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks unauthenticated user from admin routes", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── Job posting RBAC ──────────────────────────────────────────────────────────

describe("jobs RBAC", () => {
  it("blocks professionals from posting jobs", async () => {
    const { ctx } = createProfessionalCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jobs.create({
        title: "Test Job",
        description: "Test description that is long enough",
        vocation: "electrician",
        budget: 1000,
        location: "Houston, TX",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks unauthenticated users from posting jobs", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jobs.create({
        title: "Test Job",
        description: "Test description that is long enough",
        vocation: "electrician",
        budget: 1000,
        location: "Houston, TX",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks non-professionals from applying", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.applications.submitApplication({
        jobId: 1,
        coverLetter: "I am a great candidate for this role.",
        bidAmount: 500,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows public listing of jobs without auth", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw — public endpoint
    const result = await caller.jobs.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Input validation tests ────────────────────────────────────────────────────

describe("input validation", () => {
  it("rejects job creation with title too short", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jobs.create({
        title: "Hi",
        description: "Test description that is long enough",
        vocation: "electrician",
        budget: 1000,
        location: "Houston, TX",
      })
    ).rejects.toThrow();
  });

  it("rejects job creation with negative budget", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jobs.create({
        title: "Valid Title Here",
        description: "Test description that is long enough",
        vocation: "electrician",
        budget: -500,
        location: "Houston, TX",
      })
    ).rejects.toThrow();
  });

  it("rejects application with cover letter too short", async () => {
    const { ctx } = createProfessionalCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.applications.submitApplication({
        jobId: 1,
        coverLetter: "Short",
        bidAmount: 500,
      })
    ).rejects.toThrow();
  });

  it("rejects review with rating out of range", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reviews.create({
        jobId: 1,
        revieweeId: 3,
        rating: 10,
      })
    ).rejects.toThrow();
  });

  it("rejects admin role update to self", async () => {
    const { ctx } = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 99, role: "user" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ── setUserType tests ─────────────────────────────────────────────────────────

describe("auth.setUserType", () => {
  it("blocks unauthenticated users from setting user type", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.setUserType({ userType: "client" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── Messaging Tests ──────────────────────────────────────────────────────────
describe("messaging.unreadCount", () => {
  it("returns unread count for authenticated user", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.messaging.unreadCount();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });
});

describe("messaging.myConversations", () => {
  it("returns conversations for authenticated user", async () => {
    const { ctx } = createClientCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.messaging.myConversations();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Escrow Tests ──────────────────────────────────────────────────────────────
describe("escrow.listBanks", () => {
  it("returns bank list as public procedure", async () => {
    const ctx = createUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw (public procedure)
    await expect(caller.escrow.listBanks()).resolves.toBeDefined();
  });
});

describe("escrow.initBankTransfer RBAC", () => {
  it("rejects professional trying to fund escrow", async () => {
    const { ctx } = createProfessionalCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.escrow.initBankTransfer({
        jobId: 1,
        professionalId: 2,
        amount: 5000,
        bankAccountNumber: "0123456789",
        bankAccountName: "Test User",
        bankName: "Zenith Bank",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── Verification Tests ──────────────────────────────────────────────────────────────
describe("verification.myRequests", () => {
  it("returns verification requests for authenticated user", async () => {
    const { ctx } = createProfessionalCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.verification.myRequests();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("verification.adminList RBAC", () => {
  it("rejects non-admin from listing verification requests", async () => {
    const { ctx } = createProfessionalCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.verification.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to list verification requests", async () => {
    const { ctx } = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.verification.adminList();
    expect(Array.isArray(result)).toBe(true);
  });
});