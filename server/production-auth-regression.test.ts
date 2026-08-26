import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production authentication recovery", () => {
  const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

  it("uses the Vercel same-origin API proxy for production authentication", () => {
    const main = read("../client/src/main.tsx");
    const signIn = read("../client/src/pages/SignIn.tsx");
    const vercel = read("../vercel.json");
    expect(main).toContain('import.meta.env.PROD ? "" : configuredApiUrl || ""');
    expect(signIn).toContain('import.meta.env.PROD ? "" : configuredApiUrl || ""');
    expect(signIn).toContain("/api/auth/google?returnPath=");
    expect(vercel).toContain('"destination": "https://api.zylobridge.com/api/$1"');
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
