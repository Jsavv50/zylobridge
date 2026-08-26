import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production authentication recovery", () => {
  const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

  it("keeps the Vercel sign-in page pointed at Railway when VITE_API_URL is absent", () => {
    const signIn = read("../client/src/pages/SignIn.tsx");
    expect(signIn).toContain('import.meta.env.PROD ? "https://api.zylobridge.com" : ""');
    expect(signIn).toContain("/api/auth/google?returnPath=");
  });

  it("normalizes email addresses before both Supabase OTP operations", () => {
    const router = read("./routers.ts");
    expect(router).toContain("const email = input.email.trim().toLowerCase();");
    expect(router).toContain("email,\n          options: { shouldCreateUser: true }");
    expect(router).toContain("email,\n          token: input.otp,");
    expect(router).toContain("upsertUserByEmail(email, input.name)");
  });

  it("has production-safe backend and frontend redirect fallbacks", () => {
    const env = read("./_core/env.ts");
    expect(env).toContain('ENV.isProduction ? "https://api.zylobridge.com" : "http://localhost:3000"');
    expect(env).toContain('ENV.isProduction ? "https://zylobridge.com" : "http://localhost:3000"');
    expect(env).toContain("BACKEND_URL");
    expect(env).toContain("FRONTEND_URL");
  });
});
