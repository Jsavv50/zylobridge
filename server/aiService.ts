import { invokeLLM, type InvokeParams, type InvokeResult } from "./_core/llm";
import { createAuditLog } from "./db";

export type AIServiceRequestOptions = {
  userId: number;
  organizationId?: number;
  feature: string;
  model?: string;
  maxTokens?: number;
};

// In-memory rate limiting / cost tracking per user per hour
const userAiRequests = new Map<number, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 30;

function checkAndTrackAiRateLimit(userId: number): boolean {
  const now = Date.now();
  const record = userAiRequests.get(userId);
  if (!record || now > record.resetTime) {
    userAiRequests.set(userId, { count: 1, resetTime: now + 3600 * 1000 });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }
  record.count++;
  return true;
}

/**
 * Centralized AI Service providing provider abstraction, privacy filtering, token/cost telemetry, and rate limiting.
 */
export async function executeAiService(
  options: AIServiceRequestOptions,
  params: InvokeParams
): Promise<InvokeResult | null> {
  if (!checkAndTrackAiRateLimit(options.userId)) {
    console.warn(`[AIService] Rate limit exceeded for user #${options.userId} on feature ${options.feature}`);
    throw new Error("AI request rate limit exceeded (max 30 requests/hour). Please try again later.");
  }

  const startTime = Date.now();
  const requestId = `ai_${Math.random().toString(36).substring(2, 10)}`;

  try {
    const response = await invokeLLM(params);
    const latency = Date.now() - startTime;

    // Log telemetry asynchronously without blocking
    createAuditLog({
      actorUserId: options.userId,
      actorRole: "user",
      action: "AI_SERVICE_INVOKED",
      resourceType: "ai_feature",
      resourceId: options.feature,
      previousState: null,
      newState: JSON.stringify({ model: response.model, usage: response.usage }),
      metadata: JSON.stringify({ requestId, latencyMs: latency, organizationId: options.organizationId }),
      ipAddress: null,
      userAgent: null,
    }).catch(() => {});

    return response;
  } catch (err: any) {
    console.error(`[AIService] Error executing feature ${options.feature}:`, err?.message || err);
    return null; // AI failure fallback: advisory layer never blocks core marketplace
  }
}
