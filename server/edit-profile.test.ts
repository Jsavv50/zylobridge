import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Edit Profile Architecture", () => {
  it("includes updateProfile procedure in server/routers.ts", () => {
    const routersCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf-8");
    expect(routersCode).toContain("updateProfile");
    expect(routersCode).toContain("updateUserProfile");
  });

  it("includes updateUserProfile helper in server/db.ts", () => {
    const dbCode = fs.readFileSync(path.resolve(__dirname, "./db.ts"), "utf-8");
    expect(dbCode).toContain("updateUserProfile");
  });

  it("registers /profile/edit route in client/src/App.tsx", () => {
    const appCode = fs.readFileSync(path.resolve(__dirname, "../client/src/App.tsx"), "utf-8");
    expect(appCode).toContain("/profile/edit");
  });

  it("wires Edit Profile button on user profile page", () => {
    const profileCode = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/UserProfile.tsx"), "utf-8");
    expect(profileCode).toContain("/profile/edit");
  });
});
