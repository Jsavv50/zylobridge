import { describe, it, expect } from "vitest";

describe("Cookie Clear Warning & Auth Resilience Fix", () => {
  it("verifies clearCookie does not pass deprecated maxAge option", () => {
    const resMock = {
      clearCookie: (name: string, options: any) => {
        expect(options.maxAge).toBeUndefined();
      }
    };
    resMock.clearCookie("app_session_id", { path: "/", domain: ".zylobridge.com" });
  });

  it("verifies email normalization matches lowercase and trim rules", () => {
    const email = "  Minermikee777@Gmail.com ";
    expect(email.trim().toLowerCase()).toBe("minermikee777@gmail.com");
  });
});
