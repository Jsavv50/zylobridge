import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production Realtime configuration", () => {
  it("keeps server-side Realtime signing configuration and protected token behavior", () => {
    const authSource = fs.readFileSync(path.resolve(__dirname, "_core/realtimeAuth.ts"), "utf8");
    const envSource = fs.readFileSync(path.resolve(__dirname, "_core/env.ts"), "utf8");
    const routeSource = fs.readFileSync(path.resolve(__dirname, "_core/index.ts"), "utf8");

    expect(envSource).toContain("supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? \"\"");
    expect(authSource).toContain("ENV.supabaseJwtSecret");
    expect(authSource).toContain("generateRealtimeToken");
    expect(routeSource).toContain("registerRealtimeAuthRoutes(app)");
    expect(authSource).toContain("sdk.authenticateRequest");
  });
});
