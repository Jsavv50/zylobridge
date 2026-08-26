import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("recovered runtime compatibility", () => {
  it("keeps the API diagnostic root out of development so Vite owns /", () => {
    const source = readProjectFile("server/_core/index.ts");
    expect(source).toContain('if (process.env.NODE_ENV !== "development")');
    expect(source).toContain('app.get("/", (_req, res) =>');
    expect(source).toContain('await setupVite(app, server);');
  });

  it("exports every schema table required by recovered runtime modules", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    for (const table of [
      "auditLogs",
      "oauthTransactions",
      "milestones",
      "paymentTransactions",
      "payouts",
      "notificationDeliveryLogs",
    ]) {
      expect(schema).toContain(`export const ${table}`);
    }
  });

  it("uses a distinct varchar status for background jobs", () => {
    const migration = readProjectFile("drizzle/0011_recovery_reconciliation.sql");
    expect(migration).toContain('"status" varchar(32) NOT NULL DEFAULT \'pending\'');
    expect(migration).not.toContain('CREATE TYPE "job_status"');
  });

  it("allows loopback origins only outside production while preserving an explicit production allowlist", () => {
    const source = readProjectFile("server/_core/index.ts");
    expect(source).toContain('const isDevelopment = process.env.NODE_ENV !== "production";');
    expect(source).toContain("isLocalDevelopmentOrigin");
    expect(source).toContain("127");
    expect(source).toContain("allowedOrigins.includes(origin)");
    expect(source).not.toContain("allowedOrigins.length === 0");
  });
});
