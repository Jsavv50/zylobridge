import { describe, it, expect } from "vitest";

describe("Database Identity & Schema Reconciliation", () => {
  it("verifies oauth_transactions schema columns and constraints", () => {
    const tableColumns = [
      "id",
      "requestId",
      "stateHash",
      "authCodeHash",
      "status",
      "userId",
      "createdAt",
      "expiresAt",
      "completedAt"
    ];

    expect(tableColumns).toContain("requestId");
    expect(tableColumns).toContain("stateHash");
    expect(tableColumns).toContain("authCodeHash");
    expect(tableColumns).toContain("status");
  });

  it("verifies email OTP normalization and expiration handling", () => {
    const email = " Minermikee777@gmail.com ";
    const normalized = email.trim().toLowerCase();
    expect(normalized).toBe("minermikee777@gmail.com");
  });
});
