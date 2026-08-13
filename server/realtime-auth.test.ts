/**
 * Unit tests for Supabase Realtime Authorization Bridge
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerRealtimeAuthRoutes, validateRealtimeConfig } from "./_core/realtimeAuth";
import { ENV } from "./_core/env";

// Mock sdk authenticateRequest
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(async (req: any) => {
      const authHeader = req.headers["authorization"];
      if (authHeader === "Bearer valid-user-69") {
        return { id: 69, openId: "user-69", role: "user", userType: "client" };
      }
      if (authHeader === "Bearer valid-admin-99") {
        return { id: 99, openId: "admin-99", role: "admin", userType: "client" };
      }
      throw new Error("Unauthorized");
    }),
  },
}));

describe("Realtime Authorization Bridge", () => {
  const app = express();
  app.use(express.json());
  registerRealtimeAuthRoutes(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates config successfully when SUPABASE_JWT_SECRET is present", () => {
    ENV.supabaseJwtSecret = "test-jwt-secret-with-sufficient-length-for-hs256-signing";
    expect(() => validateRealtimeConfig()).not.toThrow();
  });

  it("rejects unauthenticated requests with HTTP 401", async () => {
    ENV.supabaseJwtSecret = "test-jwt-secret-with-sufficient-length-for-hs256-signing";
    const res = await request(app).get("/api/realtime/token");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized");
  });

  it("generates a valid short-lived JWT for authenticated user 69", async () => {
    ENV.supabaseJwtSecret = "test-jwt-secret-with-sufficient-length-for-hs256-signing";
    const res = await request(app)
      .get("/api/realtime/token")
      .set("Authorization", "Bearer valid-user-69");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("expiresIn", 1800);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".").length).toBe(3); // JWT format: header.payload.signature
  });

  it("generates a valid short-lived JWT for authenticated user 99", async () => {
    ENV.supabaseJwtSecret = "test-jwt-secret-with-sufficient-length-for-hs256-signing";
    const res = await request(app)
      .get("/api/realtime/token")
      .set("Authorization", "Bearer valid-admin-99");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.expiresIn).toBe(1800);
  });
});
