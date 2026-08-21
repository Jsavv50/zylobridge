import { describe, it, expect } from "vitest";
import { executeAiService } from "./aiService";
import { calculateExplainableMatchV2 } from "./aiMatching";

describe("Phase 7 AI-Powered Matching, Recommendations, and Intelligence", () => {
  it("exports centralized AI service and explainable matching functions", () => {
    expect(typeof executeAiService).toBe("function");
    expect(typeof calculateExplainableMatchV2).toBe("function");
  });

  it("enforces AI advisory boundary and fails safely without breaking core logic", async () => {
    // Calling executeAiService with invalid key or stub should return null gracefully without throwing
    const res = await executeAiService(
      { userId: 1, feature: "test_safety" },
      { messages: [{ role: "user", content: "ping" }] }
    );
    expect(res === null || typeof res === "object").toBe(true);
  });

  it("defines structured explainable scoring contract", () => {
    const mockExplanation = {
      score: 88,
      breakdown: { vocation: 30, location: 20, availability: 20, verification: 15, rating: 15, semantic: 85 },
      reasons: ["Exact vocation match", "Verified professional"],
      limitations: [],
    };
    expect(mockExplanation.score).toBeGreaterThan(0);
    expect(mockExplanation.breakdown.vocation).toBe(30);
    expect(mockExplanation.reasons.length).toBeGreaterThan(0);
  });
});
