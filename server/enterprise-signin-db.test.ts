import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Enterprise sign-in database lookup", () => {
  it("normalizes email input and performs an indexed exact lookup first", () => {
    const dbSource = fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf8");
    expect(dbSource).toContain("const normalizedEmail = email.trim().toLowerCase();");
    expect(dbSource).toContain("where(eq(users.email, normalizedEmail))");
    expect(dbSource).toContain("where(sql`LOWER(${users.email}) = ${normalizedEmail}`)");
  });

  it("does not alter role or enterprise authorization fields during lookup", () => {
    const dbSource = fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf8");
    const lookupStart = dbSource.indexOf("export async function getUserByEmail");
    const lookupEnd = dbSource.indexOf("let _db", lookupStart);
    const lookupSource = dbSource.slice(lookupStart, lookupEnd);
    expect(lookupSource).not.toContain("role =");
    expect(lookupSource).not.toContain("userType =");
  });
});
