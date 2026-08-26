import { and, eq, sql, desc, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import { users, profiles, jobs, applications, notifications, notificationPreferences, matchingScores, interviews, offers, engagements } from "../drizzle/schema";
import { sendOtpEmail } from "./email";
import { invokeLLM } from "./_core/llm";

export async function getUserNotificationPreference(userId: number) {
  const db = await getDb();
  if (!db) return { emailEnabled: true, marketingEnabled: false, marketplaceEvents: true };
  const prefs = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (prefs.length > 0) return prefs[0];
  const inserted = await db.insert(notificationPreferences).values({ userId }).returning();
  return inserted[0];
}

export async function createInAppNotification(data: { userId: number; title: string; content: string; category?: string; referenceType?: string; referenceId?: string }) {
  const db = await getDb();
  if (!db) return null;
  const prefs = await getUserNotificationPreference(data.userId);
  if (prefs.marketplaceEvents === false && data.category !== "security") {
    // respect user preference
    return null;
  }
  const res = await db.insert(notifications).values({
    userId: data.userId,
    title: data.title,
    content: data.content,
    category: data.category ?? "marketplace",
    referenceType: data.referenceType,
    referenceId: data.referenceId,
  }).returning();
  return res[0];
}

export async function getUnreadNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).limit(limit).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return true;
}

export function generateIcsContent(event: { title: string; description: string; start: Date; end: Date; location?: string; organizer?: string }) {
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZYLOBRIDGE//Marketplace//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `DTSTART:${formatDate(event.start)}`,
    `DTEND:${formatDate(event.end)}`,
    event.location ? `LOCATION:${event.location}` : "",
    event.organizer ? `ORGANIZER:${event.organizer}` : "",
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function executeMatchingV2(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return { score: 0, breakdown: {}, explanation: "Database unavailable" };

  const jobRes = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const profRes = await db.select().from(profiles).where(eq(profiles.userId, professionalId)).limit(1);
  const userRes = await db.select().from(users).where(eq(users.id, professionalId)).limit(1);

  if (jobRes.length === 0 || profRes.length === 0) {
    return { score: 0, breakdown: {}, explanation: "Job or professional not found." };
  }

  const job = jobRes[0];
  const profile = profRes[0];
  const user = userRes[0];

  let structuredScore = 0;
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // Vocation (40%)
  if (profile.vocation === job.vocation) {
    structuredScore += 40;
    breakdown.vocation = 40;
    reasons.push(`✓ Exact vocation match: ${job.vocation}`);
  } else {
    breakdown.vocation = 0;
    reasons.push(`✗ Vocation mismatch (Job: ${job.vocation}, Professional: ${profile.vocation})`);
  }

  // Availability (20%)
  if (profile.isAvailable) {
    structuredScore += 20;
    breakdown.availability = 20;
    reasons.push("✓ Professional is available for work");
  } else {
    breakdown.availability = 0;
    reasons.push("△ Professional is currently marked unavailable");
  }

  // Verification (20%)
  if (user?.isVerified) {
    structuredScore += 20;
    breakdown.verification = 20;
    reasons.push("✓ Account is verified by Zylobridge");
  } else {
    structuredScore += 10;
    breakdown.verification = 10;
    reasons.push("△ Account verification pending");
  }

  // Rating (20%)
  const rating = Number(profile.averageRating ?? 0);
  const ratingScore = Math.min(20, Math.round((rating / 5) * 20));
  structuredScore += ratingScore;
  breakdown.rating = ratingScore;
  reasons.push(`✓ Platform rating score: ${rating.toFixed(1)} / 5.0`);

  let finalScore = structuredScore;
  let explanation = reasons.join("\n");

  // Semantic AI assist (V2)
  try {
    const { invokeLLM } = await import("./_core/llm");
    const aiRes = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert recruitment matching assistant. Evaluate the fit between the job description and professional profile. Output valid JSON with keys 'semanticScore' (0 to 100 number) and 'notes' (string explanation)." },
        { role: "user", content: `Job Title: ${job.title}\nJob Description: ${job.description}\n\nProfessional Vocation: ${profile.vocation}\nProfessional Bio: ${profile.bio ?? ""}\nSkills: ${profile.skills ?? ""}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "match_v2",
          strict: true,
          schema: {
            type: "object",
            properties: {
              semanticScore: { type: "number", description: "Semantic alignment score between 0 and 100" },
              notes: { type: "string", description: "Brief explanation of semantic fit" },
            },
            required: ["semanticScore", "notes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = aiRes.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      const semanticScore = Number(parsed.semanticScore ?? 75);
      finalScore = Math.round((structuredScore * 0.7) + (semanticScore * 0.3));
      explanation = `${reasons.join("\n")}\n\nAI Semantic Fit (${semanticScore}%): ${parsed.notes}`;
    }
  } catch (err) {
    console.error("[MatchingV2] AI semantic scoring skipped/failed, using deterministic score:", err);
  }

  // Upsert matching score
  await db.insert(matchingScores).values({
    jobId,
    professionalId,
    structuredScore: String(structuredScore),
    semanticScore: String(finalScore),
    finalScore: String(finalScore),
    explanation,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [matchingScores.jobId, matchingScores.professionalId],
    set: {
      structuredScore: String(structuredScore),
      semanticScore: String(finalScore),
      finalScore: String(finalScore),
      explanation,
      updatedAt: new Date(),
    },
  });

  return {
    score: finalScore,
    breakdown,
    explanation,
  };
}
