import { describe, expect, it } from "vitest";
import { calculateExplainableJobMatch } from "../shared/jobMatching";
import { formatJobBudget, normalizeJobCurrency } from "../shared/currency";

describe("personalized professional jobs", () => {
  it("produces deterministic explainable scores from profile and job fields", () => {
    const profile = { vocation: "electrician", skills: "wiring, solar installation", location: "Johannesburg", isAvailable: true, yearsExperience: 5 };
    const job = { vocation: "electrician", title: "Solar wiring technician", description: "Complete solar installation and wiring", location: "Johannesburg", isUrgent: true, createdAt: new Date() };
    const first = calculateExplainableJobMatch(profile, job);
    const second = calculateExplainableJobMatch(profile, job);
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(90);
    expect(first.reasons.map((reason) => reason.label)).toContain("Matches your vocation");
    expect(first.reasons.map((reason) => reason.label)).toContain("Matches your skills");
    expect(first.reasons.map((reason) => reason.label)).toContain("Fits your location");
  });

  it("does not award location or skill points when those signals are absent", () => {
    const result = calculateExplainableJobMatch({ vocation: "plumber", skills: "pipe repair", location: "Lagos" }, { vocation: "electrician", title: "Electrical maintenance", description: "Panel inspection", location: "Abuja" });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("uses explicit ZAR and preserves NGN as the legacy fallback", () => {
    expect(normalizeJobCurrency("ZAR")).toBe("ZAR");
    expect(normalizeJobCurrency(null)).toBe("NGN");
    expect(formatJobBudget("12500", "ZAR")).toBe("R12,500");
    expect(formatJobBudget("125000", null)).toBe("₦125,000");
  });
});
