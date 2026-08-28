import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAuditLog } from "../db";
import {
  completeOnboarding,
  getOnboardingState,
  OnboardingRevisionConflict,
  saveOnboardingProgress,
} from "../onboarding";
import { createInAppNotification } from "../phase4";

const marketplaceRole = z.enum(["client", "professional", "enterprise"]);
const shortList = z.array(z.string().trim().min(1).max(120)).max(20);

const onboardingDraftSchema = z.object({
  primaryRole: marketplaceRole.optional(),
  additionalRoles: z.array(marketplaceRole).max(2).optional(),
  identity: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    location: z.string().trim().max(200).optional(),
    timezone: z.string().trim().max(80).optional(),
  }).partial().optional(),
  contractor: z.object({
    hiringNeeds: shortList.optional(),
    typicalJobSize: z.enum(["small", "medium", "large"]).optional(),
    urgency: z.enum(["planned", "soon", "urgent"]).optional(),
    budgetRange: z.string().trim().max(80).optional(),
    teamSize: z.string().trim().max(80).optional(),
    serviceLocations: shortList.optional(),
    organizationName: z.string().trim().max(255).optional(),
  }).partial().optional(),
  professional: z.object({
    vocation: z.string().trim().max(100).optional(),
    additionalVocations: shortList.optional(),
    skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    experienceLevel: z.enum(["starting_out", "developing", "experienced", "expert"]).optional(),
    hourlyRate: z.number().positive().max(10_000_000).optional(),
    availabilityStatus: z.enum(["available_now", "available_from", "currently_working", "not_available", "emergency_only"]).optional(),
    serviceAreas: shortList.optional(),
    willingToTravel: z.boolean().optional(),
    bio: z.string().trim().max(2_000).optional(),
    certifications: z.array(z.string().trim().min(1).max(150)).max(20).optional(),
  }).partial().optional(),
  enterprise: z.object({
    organizationName: z.string().trim().max(255).optional(),
    organizationDescription: z.string().trim().max(2_000).optional(),
    hiringVolume: z.string().trim().max(80).optional(),
    teamSize: z.string().trim().max(80).optional(),
    servicesNeeded: shortList.optional(),
    workLocations: shortList.optional(),
    budgetRange: z.string().trim().max(80).optional(),
  }).partial().optional(),
  trust: z.object({
    verificationIntent: z.enum(["now", "later"]).optional(),
    emailUpdates: z.boolean().optional(),
    marketplaceContact: z.boolean().optional(),
    preferencesSkipped: z.boolean().optional(),
  }).partial().optional(),
}).partial();

function onboardingError(error: unknown): never {
  if (error instanceof OnboardingRevisionConflict) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  const message = error instanceof Error ? error.message : "Onboarding could not be saved.";
  if (message === "Account not found") throw new TRPCError({ code: "NOT_FOUND", message });
  if (message === "Database unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Your progress could not be reached. Please retry." });
  const safeValidationMessages = new Set([
    "Your primary workspace cannot be changed through profile completion.",
    "Choose the workspace that best matches your immediate goal.",
    "Add your name before completing setup.",
    "Choose your primary vocation before completing setup.",
    "Choose a valid primary vocation.",
    "Add your organization name before completing setup.",
    "Organization name is required.",
  ]);
  if (safeValidationMessages.has(message)) throw new TRPCError({ code: "BAD_REQUEST", message });
  console.error("[Onboarding] Protected operation failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your onboarding changes could not be saved. Please retry." });
}

export const onboardingRouter = router({
  state: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getOnboardingState(ctx.user.id);
    } catch (error) {
      onboardingError(error);
    }
  }),

  saveStep: protectedProcedure
    .input(z.object({ currentStep: z.number().int().min(1).max(4), expectedRevision: z.number().int().nonnegative(), patch: onboardingDraftSchema, profileMode: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await saveOnboardingProgress({ userId: ctx.user.id, ...input });
        void createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "onboarding.progress_saved",
          resourceType: "user",
          resourceId: String(ctx.user.id),
          newState: JSON.stringify({ currentStep: result.currentStep, revision: result.revision }),
          metadata: null,
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        }).catch(() => console.warn("[Onboarding] Progress audit log unavailable"));
        return result;
      } catch (error) {
        onboardingError(error);
      }
    }),

  complete: protectedProcedure
    .input(z.object({ expectedRevision: z.number().int().nonnegative(), patch: onboardingDraftSchema, profileMode: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await completeOnboarding({ userId: ctx.user.id, ...input });
        if (!result.alreadyCompleted) {
          const sideEffects = await Promise.allSettled([
            createAuditLog({
              actorUserId: ctx.user.id,
              actorRole: ctx.user.role,
              action: "onboarding.completed",
              resourceType: "user",
              resourceId: String(ctx.user.id),
              newState: JSON.stringify({ destination: result.destination, additionalRoles: result.additionalRoles }),
              metadata: null,
              ipAddress: ctx.req.ip ?? null,
              userAgent: ctx.req.headers["user-agent"] ?? null,
            }),
            createInAppNotification({
              userId: ctx.user.id,
              title: "Your workspace is ready",
              content: "Your ZYLOBRIDGE setup is complete. You can refine your profile and verification details at any time.",
              category: "system",
              referenceType: "onboarding",
              referenceId: String(ctx.user.id),
            }),
          ]);
          if (sideEffects.some((entry) => entry.status === "rejected")) {
            console.warn("[Onboarding] Completion side effect unavailable");
          }
        }
        return result;
      } catch (error) {
        onboardingError(error);
      }
    }),
});
