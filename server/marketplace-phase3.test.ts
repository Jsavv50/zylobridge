import { describe, it, expect } from "vitest";
import { clampPageSize, clampOffset, MAX_PAGE_SIZE } from "./db";

describe("Phase 3 Marketplace Pagination & Utilities", () => {
  it("clamps page size correctly", () => {
    expect(clampPageSize(10)).toBe(10);
    expect(clampPageSize(999)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(undefined)).toBe(20);
  });

  it("clamps offset correctly", () => {
    expect(clampOffset(0)).toBe(0);
    expect(clampOffset(50)).toBe(50);
    expect(clampOffset(-10)).toBe(0);
    expect(clampOffset(undefined)).toBe(0);
  });
});
