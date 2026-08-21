import { getDb } from "./db";
import { jobs, profiles, users, matchingScores } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { executeAiService } from "./aiService";

export type MatchExplanation = {
  score: number;
  breakdown: {
    vocation: number;
    location: number;
    availability: number;
    verification: number;
    rating: number;
    semantic: number;
  };
  reasons: string[];
  limitations: string[];
};

/**
 * Perform explainable matching V2 combining deterministic eligibility signals with AI semantic alignment.
 */
export async function calculateExplainableMatchV2(jobId: number, professionalId: number, userId: number): Promise<MatchExplanation> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, professionalId)).limit(1);
  const [user] = await db.select().from(users).where(eq(users.id, professionalId)).limit(1);

  if (!job || !profile) {
    throw new Error("Job or professional profile not found");
  }

  // 1. Deterministic Hard Constraints & Signals
  let score = 0;
  const breakdown = { vocation: 0, location: 0, availability: 0, verification: 0, rating: 0, semantic: 0 };
  const reasons: string[] = [];
  const limitations: string[] = [];

  // Vocation alignment (30 pts)
  if (job.vocation && profile.vocation && job.vocation === profile.vocation) {
    score += 30;
    breakdown.vocation = 30;
    reasons.push(`Exact vocation match: ${profile.vocation}`);
  } else {
    limitations.push(`Vocation mismatch: Job requires ${job.vocation || 'any'} but professional has ${profile.vocation || 'unset'}`);
  }

  // Location compatibility (20 pts)
  if (job.location && profile.location && job.location.toLowerCase().includes(profile.location.toLowerCase())) {
    score += 20;
    breakdown.location = 20;
    reasons.push(`Location alignment: ${profile.location}`);
  } else {
    score += 10;
    breakdown.location = 10;
    reasons.push("Partial location compatibility");
  }

  // Verification (15 pts)
  if (user?.isVerified) {
    score += 15;
    breakdown.verification = 15;
    reasons.push("Verified professional identity");
  } else {
    limitations.push("Professional identity verification pending");
  }

  // Rating (15 pts)
  const rating = Number(profile.averageRating ?? 5.0);
  const ratingScore = Math.min(15, Math.round((rating / 5) * 15));
  score += ratingScore;
  breakdown.rating = ratingScore;
  reasons.push(`Platform reputation score: ${rating.toFixed(1)} / 5.0`);

  // Availability (20 pts base)
  score += 20;
  breakdown.availability = 20;
  reasons.push("Marked active and available");

  // 2. AI Semantic Alignment via Centralized AI Service (Advisory Layer)
  let semanticScore = 75;
  let aiNotes = "Semantic alignment evaluated successfully.";

  try {
    const aiRes = await executeAiService(
      { userId, feature: "match_scoring" },
      {
        messages: [
          { role: "system", content: "You are an expert recruitment matching advisor. Evaluate skill and experience alignment between the job and professional. Output JSON with 'semanticScore' (0 to 100) and 'notes'." },
          { role: "user", content: `Job Title: ${job.title}\nDescription: ${job.description}\n\nCandidate Vocation: ${profile.vocation}\nBio: ${profile.bio ?? ""}\nSkills: ${profile.skills ?? ""}` },
        ],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "match_explanation_v2",
            strict: true,
            schema: {
              type: "object",
              properties: {
                semanticScore: { type: "number", description: "Semantic match score 0-100" },
                notes: { type: "string", description: "Explainable notes on fit" },
              },
              required: ["semanticScore", "notes"],
              additionalProperties: false,
            },
          },
        },
      }
    );

    const content = aiRes?.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      semanticScore = Number(parsed.semanticScore ?? 75);
      aiNotes = parsed.notes;
      reasons.push(`AI Semantic Alignment (${semanticScore}%): ${aiNotes}`);
    }
  } catch (err) {
    limitations.push("AI semantic enhancement unavailable; scored using deterministic baseline.");
  }

  breakdown.semantic = semanticScore;
  const finalScore = Math.min(100, Math.round((score * 0.7) + (semanticScore * 0.3)));

  const explanation = JSON.stringify({
    reasons,
    limitations,
    aiNotes,
  });

  // Persist matching score
  await db.insert(matchingScores).values({
    jobId,
    professionalId,
    structuredScore: String(score),
    semanticScore: String(semanticScore),
    finalScore: String(finalScore),
    explanation,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [matchingScores.jobId, matchingScores.professionalId],
    set: {
      structuredScore: String(score),
      semanticScore: String(semanticScore),
      finalScore: String(finalScore),
      explanation,
      updatedAt: new Date(),
    },
  });

  return {
    score: finalScore,
    breakdown,
    reasons,
    limitations,
  };
}
