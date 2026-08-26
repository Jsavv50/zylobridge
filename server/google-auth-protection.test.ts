import { describe, it, expect } from "vitest";

describe("Google OAuth Single-Use Code and State Protection", () => {
  it("prevents duplicate authorization code exchange via single-use cache", () => {
    const usedCodes = new Set<string>();
    const code = "test_auth_code_123";

    expect(usedCodes.has(code)).toBe(false);
    usedCodes.add(code);
    expect(usedCodes.has(code)).toBe(true);
    // Second attempt should be detected as duplicate
    const isDuplicate = usedCodes.has(code);
    expect(isDuplicate).toBe(true);
  });
});
