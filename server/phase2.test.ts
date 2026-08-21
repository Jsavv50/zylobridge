import { describe, expect, it } from "vitest";
import { parseDateRange } from "./analytics";

describe("Phase 2 marketplace reporting contracts", () => {
  it("creates an exact custom date range", () => {
    const range = parseDateRange("custom", "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.000Z");
    expect(range.startDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.endDate.toISOString()).toBe("2026-01-31T23:59:59.000Z");
  });

  it("keeps rolling ranges finite and ordered", () => {
    const range = parseDateRange("30d");
    expect(Number.isFinite(range.startDate.getTime())).toBe(true);
    expect(Number.isFinite(range.endDate.getTime())).toBe(true);
    expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime());
    expect(range.endDate.getTime() - range.startDate.getTime()).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
  });

  it("falls back safely when a custom start date is invalid", () => {
    const range = parseDateRange("custom", "not-a-date");
    expect(Number.isFinite(range.startDate.getTime())).toBe(true);
    expect(Number.isFinite(range.endDate.getTime())).toBe(true);
    expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime());
    expect(range.endDate.getTime() - range.startDate.getTime()).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
  });
});
