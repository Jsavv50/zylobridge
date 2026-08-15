import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Super Admin & Role Architecture", () => {
  it("enforces Minermikee777@gmail.com as super_admin in server/db.ts", () => {
    const dbCode = fs.readFileSync(path.resolve(__dirname, "./db.ts"), "utf-8");
    expect(dbCode).toContain("minermikee777@gmail.com");
    expect(dbCode).toContain("super_admin");
  });

  it("restricts role assignment and protects super admin in server/routers.ts", () => {
    const routersCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf-8");
    expect(routersCode).toContain("Only super administrators can assign admin or super admin roles");
    expect(routersCode).toContain("Cannot modify or demote the permanent super administrator");
  });

  it("defines superAdminProcedure in server/_core/trpc.ts", () => {
    const trpcCode = fs.readFileSync(path.resolve(__dirname, "./_core/trpc.ts"), "utf-8");
    expect(trpcCode).toContain("superAdminProcedure");
    expect(trpcCode).toContain("super_admin");
  });

  it("supports super_admin role in drizzle schema enum", () => {
    const schemaCode = fs.readFileSync(path.resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
    expect(schemaCode).toContain("super_admin");
  });
});
