import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Super Admin login lookup", () => {
  it("normalizes email and uses indexed equality before the legacy fallback", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("const normalizedEmail = email.trim().toLowerCase();");
    expect(source).toContain("where(eq(users.email, normalizedEmail))");
    expect(source).toContain("LOWER(${users.email}) = ${normalizedEmail}");
  });

  it("preserves the dedicated Super Admin role assignment", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain('const isSuperAdmin = normalizedEmail === "minermikee777@gmail.com";');
    expect(source).toContain('updateData.role = "SUPER_ADMIN";');
  });
});
