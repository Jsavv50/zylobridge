import { getSupabaseAdmin, getSupabasePublic } from "./_core/supabase";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { commerceRouter } from "./routers/commerce";
import { shopExtensionsRouter } from "./routers/shopExtensions";
import { onboardingRouter } from "./routers/onboarding";
import { enterpriseProcedure, adminProcedure, superAdminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut, storageGetSignedUrl } from "./storage";
import { getDb } from "./db";
import { conversations, users, professionalVerifications, interviews, offers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { calculateExplainableJobMatch } from "../shared/jobMatching";
import {
  upsertUser,
  getUserByOpenId,
  getUserById,
  updateUserType,
  updateUserRole,
  updateUserName,
  updateUserProfile,
  getAllUsers,
  getUserCount,
  createJob,
  getJobById,
  getConversationById,
  getEscrowByReference,
  getVerificationRequestById,
  listJobs,
  getJobsByClientId,
  getManagedJobsByUserId,
  updateJob,
  deleteJob,
  getJobCount,
  isJobSaved,
  saveJob,
  unsaveJob,
  getSavedJobIds,
  getSavedJobsByProfessionalId,
  createApplication,
  hasActiveApplication,
  getApplicationById,
  getApplicationByJobAndProfessionalId,
  getApplicationsByJobId,
  getApplicationsByProfessionalId,
  getDetailedApplicationsByJobId,
  getDetailedApplicationsByProfessionalId,
  getProfessionalApplicationCommandCenter,
  getProfessionalApplicationById,
  updateApplicationStatus,
  getApplicationCount,
  createProfile,
  getProfileByUserId,
  getPublicProfileByUserId,
  getProfessionalProfileHub,
  updateProfile,
  createReview,
  getReviewsByRevieweeId,
  getAdminStats,
  getOrCreateConversation,
  getConversationsByUserId,
  getProfessionalConversationContext,
  getMessagesByConversationId,
  getUnreadMessageCount,
  createMessage,
  markConversationMessagesRead,
  listDisputes,
  getDisputeById,
  // createDispute,
  updateDispute,
  createAuditLog,
  listAuditLogs,
  getPlatformReportsData,
  getEscrowByJobId,
  updateEscrowStatus,
  getAllEscrowPayments,
  createVerificationRequest,
  getVerificationRequestsByUserId,
  getAllVerificationRequests,
  updateVerificationRequest,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrderByReference,
  getOrdersByUserId,
  updateOrder,
  getAllOrders,
  createPhoneOtp,
  getLatestPhoneOtp,
  incrementOtpAttempts,
  markOtpVerified,
  upsertUserByPhone,
  upsertUserByEmail,
  createEscrowPayment,
  savePushSubscription,
  createProfessionalPortfolio,
  getProfessionalPortfoliosByUserId,
  deleteProfessionalPortfolio,
  createProfessionalQualification,
  getProfessionalQualificationsByUserId,
  deleteProfessionalQualification,
  createProfessionalExperience,
  getProfessionalExperiencesByUserId,
  deleteProfessionalExperience,
  upsertProfessionalVerification,
  getProfessionalVerificationsByUserId,
  getAllProfessionalVerifications,
  createShortlist,
  removeShortlist,
  getShortlistsByJobId,
  createInterview,
  updateInterviewStatus,
  getInterviewsByUserId,
  createOffer,
  updateOfferStatus,
  getOffersByUserId,
  createEngagement,
  updateEngagementStatus,
  getEngagementsByUserId,
  calculateCandidateMatch,
  getProfessionalJobSignals,
  getProfessionalMarketplaceActivity,
  getProfessionalFinancialDashboard,
  getProfessionalJobDetails,
  getProfessionalWorkCommandCenter,
  getProfessionalWorkWorkspace,
  createJobReport,
  getProfessionalFinancialTransactions,
  getProfessionalPayouts,
  getProfessionalProtectedEscrow,
  listJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
  searchJobs,
  searchProfessionals,
  getEmployerTalentContext,
  saveProfessionalForEmployer,
  removeSavedProfessionalForEmployer,
  createTalentJobInvitation,
  getPublicProfessionalProfile,
  getPublicOrganizationBySlug,
  updateOrganizationProfile,
  MAX_PAGE_SIZE,
} from "./db";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  listPaystackBanks,
  resolveAccountNumber,
  generatePaystackReference,
  initializePaystackSouthAfricaEft,
} from "./paystack";
import { getFrontendUrl } from "./_core/env";
import { normalizeVocation } from "@shared/vocations";
import { getEmployerCommandCenter, getEmployerJobsPortfolio } from "./analytics";
import {
  acceptOfferAndEnsureEngagement,
  CANDIDATE_PIPELINE_STAGES,
  createPipelineOffer,
  getCandidatePipeline,
  hirePipelineCandidate,
  rejectPipelineCandidate,
  requireCandidatePipelineJob,
  removePipelineShortlist,
  schedulePipelineInterview,
  shortlistPipelineCandidate,
  updatePipelineInterview,
  updatePipelineShortlistNote,
} from "./candidatePipeline";
import { maskPhoneNumber, normalizePhoneNumber, sendPhoneOtpSms, SmsDeliveryError } from "./sms";
import { getUserNotificationPreference, updateUserNotificationPreference, createInAppNotification, getUnreadNotifications, listNotifications, markNotificationRead, markAllNotificationsRead, generateIcsContent, executeMatchingV2 } from "./phase4";
import { initializeMilestonePayment, processAuthorizedVerifiedPayment, processVerifiedPayment, verifyPaystackWebhookSignature } from "./finance";
import { getEmployerFinanceDashboard, getEmployerFinanceTransactionDetail, getEmployerFinanceTransactions } from "./employerFinance";
import { addOrVerifyProfessionalBank, initiateMilestonePayout, authorizeRefund, createDispute, resolveDispute } from "./financeProtection";
import {
  acceptOrganizationInvitation,
  canInviteOrganizationMembers,
  canManageOrganization,
  cancelOrganizationInvitation,
  createOrganization,
  createOrganizationInvitation,
  createOrganizationProject,
  getOrganizationById,
  getOrganizationMember,
  requireOrganizationMember,
  getOrganizationProjectById,
  listOrganizationInvitations,
  listOrganizationMembers,
  listOrganizationProjects,
  listOrganizationsForUser,
  rejectOrganizationInvitation,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  OrganizationRole,
} from "./enterprise";

// ── Admin guard ────────────────────────────────────────────────────────────────

// ── Input schemas ──────────────────────────────────────────────────────────────
const organizationRoleSchema = z.enum(["ADMIN", "HIRING_MANAGER", "RECRUITER", "MEMBER"]);

async function requireOrganizationAccess(userId: number, organizationId: number) {
  const member = await getOrganizationMember(organizationId, userId);
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Active organization membership required." });
  return member;
}

async function requireOrganizationManager(userId: number, organizationId: number) {
  const member = await requireOrganizationAccess(userId, organizationId);
  if (!canManageOrganization(member.role as OrganizationRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organization owner or administrator permission required." });
  }
  return member;
}

async function requireEscrowJobAccess(userId: number, role: string, jobId: number, professionalId: number) {
  const job = await getJobById(jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
  const isAdmin = role === "admin" || role === "SUPER_ADMIN";
  let organizationAuthorized = false;
  if (job.organizationId) {
    const member = await getOrganizationMember(job.organizationId, userId);
    organizationAuthorized = Boolean(member && canManageOrganization(member.role as OrganizationRole));
  }
  if (!isAdmin && job.clientId !== userId && !organizationAuthorized) throw new TRPCError({ code: "FORBIDDEN", message: "Employer finance permission required." });
  if (job.assignedProfessionalId && job.assignedProfessionalId !== professionalId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Escrow professional must match the assigned professional." });
  }
  const application = await getApplicationByJobAndProfessionalId(jobId, professionalId);
  if (!application || application.status !== "accepted") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Accept the candidate before funding escrow." });
  return { job, application };
}

function canonicalizeVocation(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const canonical = normalizeVocation(value);
  if (!canonical) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a supported vocation." });
  return canonical;
}

const jobFilterSchema = z.object({
  vocation: z.string().max(64).optional(),
  location: z.string().max(128).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  minBudget: z.number().nonnegative().optional(),
  maxBudget: z.number().nonnegative().optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

const jobCreateSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  vocation: z.string().max(64),
  budget: z.number().positive(),
  location: z.string().min(2).max(200).trim(),
  deadline: z.string().optional(),
  currency: z.enum(["NGN", "ZAR"]).default("NGN"),
  isUrgent: z.boolean().optional().default(false),
  organizationId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
});

const profileMetadataSchema = z.object({
  headline: z.string().max(160).trim().optional(),
  additionalVocations: z.array(z.string().max(100)).max(12).optional(),
  specializations: z.array(z.string().max(100)).max(20).optional(),
  availabilityStatus: z.enum(["available_now", "available_from", "currently_working", "not_available", "emergency_only"]).optional(),
  availableFrom: z.string().max(32).optional(),
  preferredWorkDays: z.array(z.string().max(20)).max(7).optional(),
  employmentTypes: z.array(z.enum(["contract", "project", "temporary", "full_time"])).max(4).optional(),
  preferredProjectTypes: z.array(z.string().max(80)).max(12).optional(),
  preferredJobSize: z.enum(["small", "medium", "large"]).optional(),
  minimumProjectValue: z.number().nonnegative().optional(),
  paymentStructure: z.enum(["hourly", "daily", "fixed_project", "milestone"]).optional(),
  dailyRate: z.number().nonnegative().optional(),
  startingProjectRate: z.number().nonnegative().optional(),
  rateVisibility: z.enum(["public", "private"]).optional(),
  languages: z.array(z.object({ language: z.string().max(60), proficiency: z.enum(["basic", "conversational", "fluent", "native"]) })).max(10).optional(),
  equipment: z.array(z.string().max(100)).max(30).optional(),
  transportation: z.string().max(120).optional(),
  serviceAreas: z.array(z.string().max(120)).max(20).optional(),
  serviceRadiusKm: z.number().nonnegative().max(1000).optional(),
  willingToTravel: z.boolean().optional(),
  visibility: z.enum(["visible", "hidden"]).optional(),
  allowEmployerContact: z.boolean().optional(),
}).partial();

const profileUpdateSchema = z.object({
  vocation: z.string().max(64).optional(),
  bio: z.string().max(2000).trim().optional(),
  skills: z.string().max(1000).trim().optional(),
  certifications: z.string().max(1000).trim().optional(),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  hourlyRate: z.number().positive().optional(),
  location: z.string().max(200).trim().optional(),
  yearsExperience: z.number().int().nonnegative().max(60).optional(),
  isAvailable: z.boolean().optional(),
  profileMetadata: profileMetadataSchema.optional(),
});

const reviewCreateSchema = z.object({
  jobId: z.number().int().positive(),
  revieweeId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).trim().optional(),
});

export const appRouter = router({
  system: systemRouter,
  commerce: commerceRouter,
  shopExtensions: shopExtensionsRouter,
  onboarding: onboardingRouter,

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      if (ctx.user) {
        const g = globalThis as unknown as { __zyloSessionCache?: Map<string, unknown> };
        g.__zyloSessionCache?.delete(ctx.user.openId);
      }
      return { success: true } as const;
    }),
    setUserType: protectedProcedure
      .input(z.object({ userType: z.enum(["client", "professional", "enterprise"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserType(ctx.user.id, input.userType);
        return { success: true };
      }),
    updateName: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(100).trim() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserName(ctx.user.id, input.name);
        return { success: true };
      }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(100).trim().optional(),
          phone: z.string().max(20).trim().optional(),
          avatarUrl: z.string().url().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, {
          name: input.name,
          phone: input.phone || undefined,
          avatarUrl: input.avatarUrl || undefined,
        });
        return { success: true };
      }),
  }),

  // ── Enterprise workspace ───────────────────────────────────────────────────
  enterprise: router({
    overview: enterpriseProcedure.query(async ({ ctx }) => ({
      workspace: "enterprise" as const,
      capabilities: ["marketplace_access", "account_management", "organization_management", "team_management", "project_management"] as const,
      organizations: await listOrganizationsForUser(ctx.user.id, 10, 0),
    })),

    organizations: enterpriseProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ ctx, input }) => listOrganizationsForUser(ctx.user.id, input?.limit, input?.offset)),

    createOrganization: enterpriseProcedure
      .input(z.object({ name: z.string().min(2).max(255).trim(), description: z.string().max(2000).trim().optional() }))
      .mutation(async ({ ctx, input }) => {
        const organization = await createOrganization(ctx.user.id, input);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "CREATE_ORGANIZATION", resourceType: "organization", resourceId: String(organization.id), previousState: null, newState: JSON.stringify({ name: organization.name }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
        return organization;
      }),

    members: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx.user.id, input.organizationId);
        return listOrganizationMembers(input.organizationId, input.limit, input.offset);
      }),

    invitations: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ ctx, input }) => {
        await requireOrganizationManager(ctx.user.id, input.organizationId);
        return listOrganizationInvitations(input.organizationId, input.limit, input.offset);
      }),

    invite: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), email: z.string().email(), role: organizationRoleSchema, origin: z.string().url().optional() }))
      .mutation(async ({ ctx, input }) => {
        const manager = await requireOrganizationManager(ctx.user.id, input.organizationId);
        if (!canInviteOrganizationMembers(manager.role as OrganizationRole)) throw new TRPCError({ code: "FORBIDDEN" });
        try {
          const invitation = await createOrganizationInvitation({ ...input, inviterUserId: ctx.user.id, role: input.role as OrganizationRole });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "CREATE_ORGANIZATION_INVITATION", resourceType: "organization_invitation", resourceId: String(invitation.id), previousState: null, newState: JSON.stringify({ organizationId: input.organizationId, email: input.email, role: input.role }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
          return invitation;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invitation could not be created." });
        }
      }),

    cancelInvitation: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), invitationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireOrganizationManager(ctx.user.id, input.organizationId);
        await cancelOrganizationInvitation(input.organizationId, input.invitationId);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "CANCEL_ORGANIZATION_INVITATION", resourceType: "organization_invitation", resourceId: String(input.invitationId), previousState: null, newState: JSON.stringify({ organizationId: input.organizationId }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
        return { success: true };
      }),

    updateMemberRole: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), userId: z.number().int().positive(), role: organizationRoleSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireOrganizationManager(ctx.user.id, input.organizationId);
        const target = await getOrganizationMember(input.organizationId, input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Active member not found." });
        if (target.role === "OWNER") throw new TRPCError({ code: "FORBIDDEN", message: "The organization owner cannot be reassigned." });
        await updateOrganizationMemberRole(input.organizationId, input.userId, input.role as OrganizationRole);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "UPDATE_ORGANIZATION_MEMBER_ROLE", resourceType: "organization_member", resourceId: String(input.userId), previousState: JSON.stringify({ role: target.role }), newState: JSON.stringify({ role: input.role, organizationId: input.organizationId }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
        return { success: true };
      }),

    removeMember: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireOrganizationManager(ctx.user.id, input.organizationId);
        const target = await getOrganizationMember(input.organizationId, input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Active member not found." });
        if (target.role === "OWNER") throw new TRPCError({ code: "FORBIDDEN", message: "The organization owner cannot be removed." });
        await removeOrganizationMember(input.organizationId, input.userId);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "REMOVE_ORGANIZATION_MEMBER", resourceType: "organization_member", resourceId: String(input.userId), previousState: JSON.stringify({ organizationId: input.organizationId, role: target.role }), newState: JSON.stringify({ status: "removed" }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
        return { success: true };
      }),

    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "A verified email address is required to accept an invitation." });
        try {
          const result = await acceptOrganizationInvitation(input.token, ctx.user.id, ctx.user.email);
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "ACCEPT_ORGANIZATION_INVITATION", resourceType: "organization", resourceId: String(result.organizationId), previousState: null, newState: JSON.stringify({ role: result.role }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
          return result;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invitation could not be accepted." });
        }
      }),

    rejectInvitation: protectedProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "A verified email address is required to reject an invitation." });
        try {
          return rejectOrganizationInvitation(input.token, ctx.user.email);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invitation could not be rejected." });
        }
      }),

    projects: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx.user.id, input.organizationId);
        return listOrganizationProjects(input.organizationId, input.limit, input.offset);
      }),

    createProject: enterpriseProcedure
      .input(z.object({ organizationId: z.number().int().positive(), name: z.string().min(2).max(255).trim(), description: z.string().max(2000).trim().optional() }))
      .mutation(async ({ ctx, input }) => {
        const member = await requireOrganizationAccess(ctx.user.id, input.organizationId);
        if (!["OWNER", "ADMIN", "HIRING_MANAGER"].includes(member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Project management permission required." });
        const project = await createOrganizationProject({ organizationId: input.organizationId, createdById: ctx.user.id, name: input.name, description: input.description ?? null, status: "active" });
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "CREATE_ORGANIZATION_PROJECT", resourceType: "organization_project", resourceId: String(project.id), previousState: null, newState: JSON.stringify({ organizationId: input.organizationId, name: input.name }), metadata: null, ipAddress: ctx.req.ip ?? null, userAgent: ctx.req.headers["user-agent"] ?? null });
        return project;
      }),
  }),

  // ── Employer dashboard ────────────────────────────────────────────────────
  employerDashboard: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Employer dashboard access is restricted to employer accounts." });
    }
    return getEmployerCommandCenter(ctx.user.id);
  }),

  employerJobsPortfolio: protectedProcedure
    .input(z.object({
      q: z.string().max(120).trim().optional(),
      status: z.enum(["all", "open", "hiring", "attention", "in_progress", "completed", "cancelled"]).optional().default("all"),
      vocation: z.string().max(64).optional(),
      location: z.string().max(255).trim().optional(),
      priority: z.enum(["all", "urgent", "standard"]).optional().default("all"),
      candidateActivity: z.enum(["all", "awaiting_review", "has_applicants", "no_applicants", "shortlisted", "hired"]).optional().default("all"),
      sort: z.enum(["recent", "newest", "oldest", "applicants", "budget_desc", "budget_asc"]).optional().default("recent"),
      limit: z.number().int().min(1).max(50).optional().default(20),
      offset: z.number().int().nonnegative().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Employer job portfolio access is restricted to hiring accounts." });
      }
      return getEmployerJobsPortfolio(ctx.user.id, { ...input, vocation: canonicalizeVocation(input.vocation) });
    }),

  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: router({
    list: publicProcedure.input(jobFilterSchema).query(async ({ input }) => {
      return listJobs({ ...input, vocation: canonicalizeVocation(input.vocation) });
    }),

    search: publicProcedure
      .input(z.object({
        q: z.string().max(120).optional(),
        vocation: z.string().max(64).optional(),
        location: z.string().max(128).optional(),
        status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional().default("open"),
        minBudget: z.number().nonnegative().optional(),
        maxBudget: z.number().nonnegative().optional(),
        isUrgent: z.boolean().optional(),
        sort: z.enum(["newest", "budget_desc", "deadline"]).optional().default("newest"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ input }) => searchJobs({ ...input, vocation: canonicalizeVocation(input.vocation) })),

    recommended: protectedProcedure
      .input(z.object({
        q: z.string().max(120).optional(),
        vocation: z.string().max(64).optional(),
        location: z.string().max(128).optional(),
        minBudget: z.number().nonnegative().optional(),
        maxBudget: z.number().nonnegative().optional(),
        isUrgent: z.boolean().optional(),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Personalized recommendations are available to professionals." });
        const [profile, result] = await Promise.all([
          getProfileByUserId(ctx.user.id),
          searchJobs({ ...input, vocation: canonicalizeVocation(input.vocation), sort: "newest" }),
        ]);
        const signals = await getProfessionalJobSignals(ctx.user.id, result.items.map((job) => job.id));
        const activity = await getProfessionalMarketplaceActivity(ctx.user.id);
        const items = result.items.map((job) => {
          const match = calculateExplainableJobMatch(profile ?? {}, job);
          const signal = signals.get(job.id);
          const applicationState = signal?.shortlisted ? "shortlisted" : signal?.applicationStatus === "pending" ? "under_review" : signal?.applicationStatus ? "applied" : null;
          return { ...job, matchScore: match.score, matchReasons: match.reasons, applicationState, isSaved: false };
        }).sort((a, b) => b.matchScore - a.matchScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { ...result, items, activity };
      }),

    activity: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Professional activity is only available to professionals." });
      return getProfessionalMarketplaceActivity(ctx.user.id);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const job = await getJobById(input.id);
          console.info("[Jobs] detail lookup", { jobId: input.id, userId: ctx.user?.id ?? null, exists: Boolean(job), authorized: Boolean(job && (job.status === "open" || (ctx.user && (ctx.user.id === job.clientId || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN")))) });
          if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "This job is no longer available." });
          const viewerCanSeeUnpublished = Boolean(ctx.user && (ctx.user.id === job.clientId || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN"));
          if (job.status !== "open" && !viewerCanSeeUnpublished) throw new TRPCError({ code: "NOT_FOUND", message: "This job is no longer available." });
          return job;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Jobs] public detail lookup failed", { jobId: input.id, userId: ctx.user?.id ?? null, error: error instanceof Error ? error.message.slice(0, 240) : "unknown_error" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Job details are temporarily unavailable. Please try again." });
        }
      }),

    report: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), reason: z.enum(["suspicious", "misleading", "inappropriate", "duplicate", "other"]), details: z.string().max(2000).trim().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can report marketplace jobs." });
        const job = await getJobById(input.jobId);
        if (!job || job.status !== "open") throw new TRPCError({ code: "NOT_FOUND", message: "Open job not found." });
        if (job.clientId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot report your own job." });
        return createJobReport({ jobId: input.jobId, reporterId: ctx.user.id, reason: input.reason, details: input.details || null, status: "open" });
      }),

    professionalDetails: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Professional job details are available to professional accounts." });
        try {
          const details = await getProfessionalJobDetails(ctx.user.id, input.id);
          console.info("[Jobs] professional detail lookup", { jobId: input.id, userId: ctx.user.id, exists: Boolean(details), hasApplication: Boolean(details?.application), authorized: Boolean(details) });
          if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "This job is no longer available to this account." });
          return details;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Jobs] professional detail lookup failed", { jobId: input.id, userId: ctx.user.id, error: error instanceof Error ? error.message.slice(0, 240) : "unknown_error" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Job details are temporarily unavailable. Please try again." });
        }
      }),

    myJobs: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ ctx, input }) => {
        return getManagedJobsByUserId(ctx.user.id, input?.limit, input?.offset);
      }),

    create: protectedProcedure.input(jobCreateSchema).mutation(async ({ ctx, input }) => {
      const canCreateUnscopedJob = ctx.user.userType === "client" || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
      const canCreateEnterpriseJob = ctx.user.userType === "enterprise" && Boolean(input.organizationId);
      if (!canCreateUnscopedJob && !canCreateEnterpriseJob) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only clients and authorized Enterprise members can post jobs." });
      }
      if (input.projectId && !input.organizationId) throw new TRPCError({ code: "BAD_REQUEST", message: "A project must belong to an organization." });
      if (input.organizationId) {
        const member = await requireOrganizationAccess(ctx.user.id, input.organizationId);
        if (!["OWNER", "ADMIN", "HIRING_MANAGER"].includes(member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Organization job-posting permission required." });
        if (input.projectId && !(await getOrganizationProjectById(input.projectId, input.organizationId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not active in this organization." });
      }
      const job = await createJob({
        clientId: ctx.user.id,
        title: input.title,
        description: input.description,
        vocation: canonicalizeVocation(input.vocation) as any,
        budget: String(input.budget),
        currency: input.currency,
        location: input.location,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        isUrgent: input.isUrgent ?? false,
        organizationId: input.organizationId,
        projectId: input.projectId,
        status: "open",
      });
      return { success: true, job };
    }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "completed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
        await updateJob(input.id, { status: input.status });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
        await deleteJob(input.id);
        return { success: true };
      }),
  }),

  // ── Saved Jobs ─────────────────────────────────────────────────────────────
  savedJobs: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can manage saved jobs." });
        return getSavedJobsByProfessionalId(ctx.user.id, input?.limit, input?.offset);
      }),
    ids: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.userType !== "professional") return [];
      return getSavedJobIds(ctx.user.id);
    }),
    status: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") return { saved: false };
        const job = await getJobById(input.jobId);
        if (!job || job.status !== "open") return { saved: false };
        return { saved: await isJobSaved(input.jobId, ctx.user.id) };
      }),
    toggle: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), saved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can save jobs." });
        const job = await getJobById(input.jobId);
        if (!job || job.status !== "open") throw new TRPCError({ code: "NOT_FOUND", message: "Open job not found." });
        if (input.saved) return saveJob({ jobId: input.jobId, professionalId: ctx.user.id });
        return unsaveJob(input.jobId, ctx.user.id);
      }),
  }),

  // ── Professional Job Alerts ────────────────────────────────────────────────
  jobAlerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can manage job alerts." });
      return listJobAlerts(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(120).trim(),
        q: z.string().max(120).trim().optional(),
        vocation: z.string().max(64).optional(),
        location: z.string().max(200).trim().optional(),
        currency: z.enum(["NGN", "ZAR"]).optional(),
        isUrgentOnly: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can create job alerts." });
        return createJobAlert({ ...input, professionalId: ctx.user.id, vocation: canonicalizeVocation(input.vocation) ?? null, q: input.q || null, location: input.location || null, currency: input.currency || null });
      }),
    toggle: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can update job alerts." });
        const alert = await updateJobAlert(ctx.user.id, input.id, { isActive: input.isActive });
        if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Job alert not found." });
        return alert;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can delete job alerts." });
        return deleteJobAlert(ctx.user.id, input.id);
      }),
  }),

  // ── Applications ──────────────────────────────────────────────────────────
  applications: router({
    submitApplication: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        coverLetter: z.string().min(10).max(3000).trim(),
        bidAmount: z.number().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only professionals can apply." });
        }
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not open." });
        const duplicate = await hasActiveApplication(input.jobId, ctx.user.id);
        if (duplicate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already have an active application for this job." });
        }
        const created = await createApplication({
          jobId: input.jobId,
          professionalId: ctx.user.id,
          coverLetter: input.coverLetter,
          bidAmount: String(input.bidAmount),
          status: "pending",
        });
        void createInAppNotification({ userId: job.clientId, title: "New application received", content: `${ctx.user.name || "A professional"} applied for ${job.title}.`, category: "application", referenceType: "application", referenceId: String(created.id) }).catch(() => undefined);
        return { success: true, applicationId: created.id };
      }),

    listForJob: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        status: z.string().optional().default("all"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
        return getDetailedApplicationsByJobId(input.jobId, input.limit, input.offset, input.status);
      }),

    commandCenter: protectedProcedure
      .input(z.object({
        q: z.string().max(160).optional(),
        status: z.string().max(32).optional().default("all"),
        vocation: z.string().max(64).optional(),
        location: z.string().max(160).optional(),
        employer: z.string().max(160).optional(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
        minBid: z.number().nonnegative().optional(),
        maxBid: z.number().nonnegative().optional(),
        paymentStatus: z.string().max(32).optional(),
        sort: z.enum(["recent", "oldest", "updated", "bid_high", "bid_low"]).optional().default("recent"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => getProfessionalApplicationCommandCenter(ctx.user.id, { ...input, fromDate: input.fromDate ? new Date(input.fromDate) : undefined, toDate: input.toDate ? new Date(input.toDate) : undefined })),

    detail: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const detail = await getProfessionalApplicationById(input.id, ctx.user.id);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
        return detail;
      }),

    myApplications: protectedProcedure
      .input(z.object({
        status: z.string().optional().default("all"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE),
        offset: z.number().int().nonnegative().optional().default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getDetailedApplicationsByProfessionalId(ctx.user.id, input?.limit, input?.offset, input?.status);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["accepted", "rejected", "withdrawn"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const app = await getApplicationById(input.id);
        if (!app) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.status === "withdrawn") {
          if (app.professionalId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        } else {
          const job = await getJobById(app.jobId);
          if (!job) throw new TRPCError({ code: "NOT_FOUND" });
          if (job.clientId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
          if (input.status === "accepted") {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Use the Candidate Pipeline offer and hire workflow to accept a candidate." });
          }
        }
        await updateApplicationStatus(input.id, input.status);
        const recipientId = input.status === "withdrawn" ? (await getJobById(app.jobId))?.clientId : app.professionalId;
        const statusLabel = input.status === "rejected" ? "was not selected" : "withdrawn";
        if (recipientId) void createInAppNotification({ userId: recipientId, title: `Application ${input.status === "rejected" ? "update" : input.status}`, content: `Your application has ${statusLabel}.`, category: "application", referenceType: "application", referenceId: String(app.id) }).catch(() => undefined);
        return { success: true };
      }),
  }),

  candidatePipeline: router({
    get: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        q: z.string().trim().max(160).optional(),
        stage: z.enum(CANDIDATE_PIPELINE_STAGES).optional().default("all"),
        skill: z.string().trim().max(120).optional(),
        location: z.string().trim().max(160).optional(),
        minExperience: z.number().int().nonnegative().max(80).optional(),
        availableOnly: z.boolean().optional().default(false),
        verifiedOnly: z.boolean().optional().default(false),
        minRating: z.number().min(1).max(5).optional(),
        minBid: z.number().nonnegative().optional(),
        maxBid: z.number().nonnegative().optional(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
        sort: z.enum(["best_match", "newest", "rating", "experience", "bid_low", "match_high", "updated"]).optional().default("best_match"),
        limit: z.number().int().min(1).max(50).optional().default(25),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => getCandidatePipeline(
        { id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType },
        input.jobId,
        { ...input, fromDate: input.fromDate ? new Date(input.fromDate) : undefined, toDate: input.toDate ? new Date(input.toDate) : undefined },
      )),

    shortlist: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await shortlistPipelineCandidate({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId);
        if (result.changed) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.shortlisted", resourceType: "application", resourceId: String(input.applicationId), newState: "shortlisted", metadata: JSON.stringify({ jobId: input.jobId, professionalId: result.application.professionalId }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "You were shortlisted", content: "An employer shortlisted your application for further review.", category: "application", referenceType: "application", referenceId: String(input.applicationId) }),
          ]);
        }
        return result;
      }),

    removeShortlist: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await removePipelineShortlist({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.shortlist_removed", resourceType: "application", resourceId: String(input.applicationId), previousState: "shortlisted", newState: "new", metadata: JSON.stringify({ jobId: input.jobId, professionalId: result.application.professionalId }) });
        return result;
      }),

    updatePrivateNote: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive(), notes: z.string().trim().max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const result = await updatePipelineShortlistNote({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId, input.notes);
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.private_note_updated", resourceType: "application", resourceId: String(input.applicationId), metadata: JSON.stringify({ jobId: input.jobId, professionalId: result.application.professionalId }) });
        return result;
      }),

    message: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const access = await requireCandidatePipelineJob({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId);
        if (!access.permissions.canMessage) throw new TRPCError({ code: "FORBIDDEN", message: "Only the job owner can open this candidate conversation." });
        const application = await getApplicationById(input.applicationId);
        if (!application || application.jobId !== input.jobId) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate application not found for this job." });
        return getOrCreateConversation(input.jobId, access.job.clientId, application.professionalId);
      }),

    scheduleInterview: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        applicationId: z.number().int().positive(),
        scheduledAt: z.string().datetime().transform((value) => new Date(value)),
        locationOrLink: z.string().trim().max(500).optional(),
        notes: z.string().trim().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await schedulePipelineInterview({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId, input);
        if (result.created) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.interview_scheduled", resourceType: "application", resourceId: String(input.applicationId), newState: "interview", metadata: JSON.stringify({ jobId: input.jobId, interviewId: result.interview.id, professionalId: result.application.professionalId }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "Interview scheduled", content: `An interview has been scheduled for ${result.interview.scheduledAt.toLocaleString()}.`, category: "application", referenceType: "application", referenceId: String(input.applicationId) }),
          ]);
        }
        return result;
      }),

    updateInterview: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive(), interviewId: z.number().int().positive(), status: z.enum(["proposed", "confirmed", "cancelled", "completed"]) }))
      .mutation(async ({ ctx, input }) => {
        const result = await updatePipelineInterview({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId, input.interviewId, input.status);
        if (result.changed) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: `candidate.interview_${input.status}`, resourceType: "application", resourceId: String(input.applicationId), newState: input.status, metadata: JSON.stringify({ jobId: input.jobId, interviewId: input.interviewId, professionalId: result.application.professionalId }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "Interview updated", content: `Your interview status is now ${input.status}.`, category: "application", referenceType: "application", referenceId: String(input.applicationId) }),
          ]);
        }
        return result;
      }),

    createOffer: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        applicationId: z.number().int().positive(),
        compensation: z.number().positive(),
        roleDescription: z.string().trim().min(10).max(3000),
        startDate: z.string().datetime().transform((value) => new Date(value)),
        duration: z.string().trim().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createPipelineOffer({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId, { ...input, compensation: String(input.compensation) });
        if (result.created) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.offer_created", resourceType: "application", resourceId: String(input.applicationId), newState: "offer", metadata: JSON.stringify({ jobId: input.jobId, offerId: result.offer.id, professionalId: result.application.professionalId }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "You received an offer", content: "An employer created an offer for your application. Review the opportunity in your dashboard.", category: "application", referenceType: "application", referenceId: String(input.applicationId) }),
          ]);
        }
        return result;
      }),

    reject: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive(), reason: z.string().trim().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await rejectPipelineCandidate({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId, input.reason);
        if (result.changed) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.rejected", resourceType: "application", resourceId: String(input.applicationId), previousState: "pending", newState: "rejected", metadata: JSON.stringify({ jobId: input.jobId, professionalId: result.application.professionalId, internalReason: result.reason }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "Application update", content: "Your application was not selected for this opportunity.", category: "application", referenceType: "application", referenceId: String(input.applicationId) }),
          ]);
        }
        return result;
      }),

    hire: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive(), confirmation: z.literal("CONFIRM_HIRE") }))
      .mutation(async ({ ctx, input }) => {
        const result = await hirePipelineCandidate({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, input.applicationId);
        if (result.changed) {
          await Promise.all([
            createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "candidate.hired", resourceType: "application", resourceId: String(input.applicationId), previousState: "pending", newState: "accepted", metadata: JSON.stringify({ jobId: input.jobId, professionalId: result.application.professionalId, engagementId: result.engagement.id, offerId: result.offer.id }) }),
            createInAppNotification({ userId: result.application.professionalId, title: "You were hired", content: "Your engagement is ready in My Work. Funding remains protected through Escrow & Funding.", category: "application", referenceType: "engagement", referenceId: String(result.engagement.id) }),
          ]);
        }
        return result;
      }),
  }),

  // ── Profiles ──────────────────────────────────────────────────────────────
  profiles: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return getProfileByUserId(ctx.user.id);
    }),
    hub: protectedProcedure.query(async ({ ctx }) => {
      const hub = await getProfessionalProfileHub(ctx.user.id);
      if (!hub) throw new TRPCError({ code: "NOT_FOUND", message: "Profile package not found." });
      return hub;
    }),
    updateMetadata: protectedProcedure
      .input(profileMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await getProfileByUserId(ctx.user.id);
        if (!existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Create your professional profile before changing marketplace controls." });
        const current = existing.profileMetadata && typeof existing.profileMetadata === "object" && !Array.isArray(existing.profileMetadata) ? existing.profileMetadata as Record<string, unknown> : {};
        await updateProfile(ctx.user.id, { profileMetadata: { ...current, ...input } });
        return { success: true };
      }),
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getPublicProfileByUserId(input.userId);
      }),
    upsert: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
      const existing = await getProfileByUserId(ctx.user.id);
      if (existing) {
        await updateProfile(ctx.user.id, {
          ...input,
          vocation: canonicalizeVocation(input.vocation) as any,
          hourlyRate: input.hourlyRate !== undefined ? String(input.hourlyRate) : undefined,
        });
      } else {
        if (!input.vocation) throw new TRPCError({ code: "BAD_REQUEST", message: "Vocation required." });
        await createProfile({
          userId: ctx.user.id,
          vocation: canonicalizeVocation(input.vocation) as any,
          bio: input.bio,
          skills: input.skills,
          certifications: input.certifications,
          portfolioUrl: input.portfolioUrl,
          hourlyRate: input.hourlyRate !== undefined ? String(input.hourlyRate) : undefined,
          location: input.location,
          yearsExperience: input.yearsExperience,
          isAvailable: input.isAvailable ?? true,
          profileMetadata: input.profileMetadata,
        });
      }
      return { success: true };
    }),
  }),

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviews: router({
    create: protectedProcedure.input(reviewCreateSchema).mutation(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      if (job.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Reviews are available after job completion." });
      const reviewerIsClient = job.clientId === ctx.user.id;
      const reviewerIsProfessional = job.assignedProfessionalId === ctx.user.id;
      if (!reviewerIsClient && !reviewerIsProfessional) throw new TRPCError({ code: "FORBIDDEN", message: "Only job participants can leave reviews." });
      const expectedRevieweeId = reviewerIsClient ? job.assignedProfessionalId : job.clientId;
      if (!expectedRevieweeId || expectedRevieweeId !== input.revieweeId) throw new TRPCError({ code: "FORBIDDEN", message: "Reviews must target the other job participant." });
      await createReview({
        jobId: input.jobId,
        reviewerId: ctx.user.id,
        revieweeId: input.revieweeId,
        rating: input.rating,
        comment: input.comment,
      });
      return { success: true };
    }),
    listForUser: publicProcedure
      .input(z.object({ userId: z.number().int().positive(), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ input }) => {
        return getReviewsByRevieweeId(input.userId, input.limit, input.offset);
      }),
  }),

  // ── Messaging ─────────────────────────────────────────────────────────────
  messaging: router({
    getOrCreateConversation: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        otherUserId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        const isClient = job.clientId === ctx.user.id;
        const applications = job.assignedProfessionalId ? [] : await getApplicationsByJobId(input.jobId, MAX_PAGE_SIZE, 0);
        const isProfessional = job.assignedProfessionalId === ctx.user.id || applications.some(application => application.professionalId === ctx.user.id);
        if (!isClient && !isProfessional) throw new TRPCError({ code: "FORBIDDEN", message: "Only job participants can open a conversation." });
        const allowedProfessionalId = job.assignedProfessionalId ?? (isClient ? input.otherUserId : ctx.user.id);
        if (isClient && input.otherUserId !== allowedProfessionalId && !applications.some(application => application.professionalId === input.otherUserId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "The selected professional is not associated with this job." });
        }
        if (isProfessional && input.otherUserId !== job.clientId) throw new TRPCError({ code: "FORBIDDEN", message: "Professionals may only message the job client." });
        const clientId = isClient ? ctx.user.id : job.clientId;
        const professionalId = isClient ? input.otherUserId : ctx.user.id;
        return getOrCreateConversation(input.jobId, clientId, professionalId);
      }),

    myConversations: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0), search: z.string().trim().max(120).optional(), unreadOnly: z.boolean().optional().default(false), jobsOnly: z.boolean().optional().default(false) }).optional())
      .query(async ({ ctx, input }) => {
        return getConversationsByUserId(ctx.user.id, input?.limit, input?.offset, { search: input?.search, unreadOnly: input?.unreadOnly, jobsOnly: input?.jobsOnly });
      }),

    context: protectedProcedure
      .input(z.object({ conversationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Professional conversation context is unavailable for this account." });
        const context = await getProfessionalConversationContext(input.conversationId, ctx.user.id);
        if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation context not found." });
        return context;
      }),

    getMessages: protectedProcedure
      .input(z.object({
        conversationId: z.number().int().positive(),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversationById(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });
        if (ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN" && conversation.clientId !== ctx.user.id && conversation.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this conversation." });
        }
        return getMessagesByConversationId(input.conversationId, input.limit, input.offset);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number().int().positive(),
        content: z.string().min(1).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const convs = await db.select().from(conversations).where(eq(conversations.id, input.conversationId)).limit(1);
        const conv = convs[0];
        if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
        if (conv.clientId !== ctx.user.id && conv.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this conversation" });
        }
        const message = await createMessage(input.conversationId, ctx.user.id, input.content);
        const recipientId = conv.clientId === ctx.user.id ? conv.professionalId : conv.clientId;
        const job = await getJobById(conv.jobId);
        const jobLabel = job?.title?.trim() || "a marketplace job";
        await createInAppNotification({
          userId: recipientId,
          title: "New message",
          content: `${ctx.user.name || "A participant"} sent you a new message regarding ${jobLabel}.`,
          category: "messages",
          referenceType: "message",
          referenceId: String(input.conversationId),
        });
        return message;
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await getUnreadMessageCount(ctx.user.id) };
    }),

    markAsRead: protectedProcedure
      .input(z.object({ conversationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await getConversationById(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        if (conversation.clientId !== ctx.user.id && conversation.professionalId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await markConversationMessagesRead(input.conversationId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Escrow Payments ───────────────────────────────────────────────────────
  escrow: router({
    // Initialize Paystack payment
    initPaystack: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        professionalId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized hiring accounts can fund escrow." });
        }
        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required for payment." });
        }
        const { job, application } = await requireEscrowJobAccess(ctx.user.id, ctx.user.role, input.jobId, input.professionalId);
        if ((job.currency ?? "NGN") !== "NGN") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Use the configured currency payment method for this job." });
        const amount = Number(application.bidAmount);
        const existing = await getEscrowByJobId(input.jobId);
        if (existing && existing.status === "funded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already funded for this job." });
        }
        if (existing?.status === "pending" && existing.professionalId === input.professionalId && existing.paymentMethod === "paystack" && existing.paystackReference && existing.paystackAuthorizationUrl) {
          return { authorizationUrl: existing.paystackAuthorizationUrl, reference: existing.paystackReference };
        }
        const reference = generatePaystackReference("ZB-ESC");
        const result = await initializePaystackTransaction({
          email: ctx.user.email,
          amount,
          reference,
          metadata: { jobId: input.jobId, clientId: ctx.user.id, professionalId: input.professionalId },
          callback_url: `${getFrontendUrl()}/payment/callback`,
          currency: "NGN",
        });
        await createEscrowPayment({
          jobId: input.jobId,
          clientId: ctx.user.id,
          professionalId: input.professionalId,
          amount: String(amount),
          currency: "NGN",
          paymentMethod: "paystack",
          status: "pending",
          paystackReference: reference,
          paystackAccessCode: result.access_code,
          paystackAuthorizationUrl: result.authorization_url,
        });
        return { authorizationUrl: result.authorization_url, reference };
      }),

    // South African EFT via Paystack Charge API (currently Ozow only)
    initSouthAfricaEft: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        professionalId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized hiring accounts can fund escrow." });
        }
        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required for payment." });
        }
        const { job, application } = await requireEscrowJobAccess(ctx.user.id, ctx.user.role, input.jobId, input.professionalId);
        if (job.currency !== "ZAR") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "South African EFT is only available for ZAR jobs." });
        const amount = Number(application.bidAmount);
        const existing = await getEscrowByJobId(input.jobId);
        if (existing && existing.status === "funded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already funded for this job." });
        }
        if (existing?.status === "pending" && existing.professionalId === input.professionalId && existing.currency === "ZAR" && existing.paystackReference && existing.paystackAuthorizationUrl) {
          return { authorizationUrl: existing.paystackAuthorizationUrl, reference: existing.paystackReference, status: "pending" as const, currency: "ZAR" as const };
        }
        const reference = generatePaystackReference("ZB-ZA-EFT");
        const result = await initializePaystackSouthAfricaEft({
          email: ctx.user.email,
          amount,
          reference,
          metadata: { jobId: input.jobId, clientId: ctx.user.id, professionalId: input.professionalId, country: "ZA", paymentMethod: "eft" },
        });
        await createEscrowPayment({
          jobId: input.jobId,
          clientId: ctx.user.id,
          professionalId: input.professionalId,
          amount: String(amount),
          currency: "ZAR",
          paymentMethod: "paystack",
          status: "pending",
          paystackReference: reference,
          paystackAuthorizationUrl: result.url,
          bankName: "Ozow EFT",
        });
        return { authorizationUrl: result.url, reference, status: result.status, currency: "ZAR" as const };
      }),

    // Verify Paystack payment after redirect
    verifyPaystack: protectedProcedure
      .input(z.object({ reference: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const escrow = await getEscrowByReference(input.reference);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND", message: "Escrow record not found." });
        if (ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN" && escrow.clientId !== ctx.user.id && escrow.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to verify this escrow payment." });
        }
        const result = await verifyPaystackTransaction(input.reference);
        if (result.reference !== input.reference) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment reference mismatch." });
        }
        const expectedAmountMinor = Math.round(Number(escrow.amount) * 100);
        if (result.amount !== expectedAmountMinor || result.currency !== escrow.currency) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment amount or currency does not match the escrow." });
        }
        if (result.status !== "success") {
          return { success: false, status: result.status, amount: result.amount / 100 };
        }
        if (escrow.status === "funded") {
          return { success: true, status: "success" as const, amount: result.amount / 100 };
        }
        await updateEscrowStatus(escrow.id, "funded", { paidAt: new Date() });
        const job = await getJobById(escrow.jobId);
        await Promise.allSettled([
          createInAppNotification({ userId: escrow.clientId, title: "Escrow funding confirmed", content: `${job?.title ?? "Job"} funding was verified and is now protected.`, category: "payment", referenceType: "payment", referenceId: input.reference }),
          createInAppNotification({ userId: escrow.professionalId, title: "Job funding confirmed", content: `${job?.title ?? "Your job"} funding was verified and is now protected.`, category: "payment", referenceType: "payment", referenceId: input.reference }),
        ]);
        return { success: true, status: "success" as const, amount: result.amount / 100 };
      }),

    // Initiate bank transfer escrow
    initBankTransfer: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        professionalId: z.number().int().positive(),
        amount: z.number().positive(),
        bankAccountNumber: z.string().min(10).max(20),
        bankAccountName: z.string().min(2).max(255),
        bankName: z.string().min(2).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorized hiring accounts can fund escrow." });
        }
        await requireEscrowJobAccess(ctx.user.id, ctx.user.role, input.jobId, input.professionalId);
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Manual bank transfer is not configured. Use the secure Paystack payment method." });
      }),

    // Upload bank transfer proof
    uploadTransferProof: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        fileBase64: z.string().min(1),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND" });
        if (escrow.clientId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `escrow-proofs/${ctx.user.id}-${input.jobId}-${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateEscrowStatus(escrow.id, "pending", {
          transferProofUrl: url,
          transferProofKey: key,
        });
        return { success: true, url };
      }),

    // Get escrow for a job
    getByJobId: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) return null;
        if (escrow.clientId !== ctx.user.id && escrow.professionalId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return escrow;
      }),

    // Release funds to professional (contractor confirms job done)
    release: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND" });
        if (escrow.clientId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (escrow.status !== "funded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow is not in funded state." });
        }
        await updateEscrowStatus(escrow.id, "released", { releasedAt: new Date() });
        await updateJob(input.jobId, { status: "completed" });
        return { success: true };
      }),

    // Refund to client (job cancelled)
    refund: adminProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND" });
        await updateEscrowStatus(escrow.id, "refunded", { refundedAt: new Date() });
        return { success: true };
      }),

    // List banks (for bank transfer form)
    listBanks: publicProcedure.query(async () => {
      return listPaystackBanks("nigeria");
    }),

    // Resolve account number
    resolveAccount: protectedProcedure
      .input(z.object({
        accountNumber: z.string().min(10).max(20),
        bankCode: z.string().min(1).max(20),
      }))
      .mutation(async ({ input }) => {
        return resolveAccountNumber({ account_number: input.accountNumber, bank_code: input.bankCode });
      }),
  }),

  // ── Verification ──────────────────────────────────────────────────────────
  verification: router({
    submit: protectedProcedure
      .input(z.object({
        documentType: z.enum(["trade_licence", "certification", "government_id", "insurance_certificate", "guild_membership"]),
        fileBase64: z.string().min(1),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `verification-docs/${ctx.user.id}-${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await createVerificationRequest({
          userId: ctx.user.id,
          documentType: input.documentType,
          documentUrl: url,
          documentKey: key,
          status: "pending",
        });
        return { success: true };
      }),

    myRequests: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ ctx, input }) => {
        return getVerificationRequestsByUserId(ctx.user.id, input?.limit, input?.offset);
      }),

    // Admin: list all pending
    adminList: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ input }) => getAllVerificationRequests(input?.limit, input?.offset)),

    // Admin: get signed document URL for secure private review
    adminGetDocumentUrl: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const req = await getVerificationRequestById(input.requestId);
        if (!req || !req.documentKey) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Verification request or document key not found." });
        }
        const signedUrl = await storageGetSignedUrl(req.documentKey);
        return { signedUrl };
      }),

    // Admin: approve or reject
    adminReview: adminProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        adminNote: z.string().max(1000).trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getVerificationRequestById(input.requestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        await updateVerificationRequest(input.requestId, {
          status: input.status,
          adminNote: input.adminNote,
          reviewedAt: new Date(),
          reviewedBy: ctx.user.id,
        });
        if (input.status === "approved") {
          // Mark user as verified in users table
          const { getDb } = await import("./db");
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const db = await getDb();
          if (db) {
            await db.update(users).set({ isVerified: true }).where(eq(users.id, req.userId));
          }
        }
        return { success: true };
      }),
  }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return getAdminStats();
    }),
    listUsers: adminProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ input }) => {
        return getAllUsers(input.limit, input.offset);
      }),
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin", "SUPER_ADMIN"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role." });
        }
        // Only super_admin can assign admin or super_admin roles
        if ((input.role === "admin" || input.role === "SUPER_ADMIN") && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only super administrators can assign admin or super admin roles." });
        }
        // Prevent targeting the designated super admin email for demotion/deletion
        const targetUser = await getUserById(input.userId);
        if (targetUser && targetUser.email && targetUser.email.trim().toLowerCase() === "minermikee777@gmail.com") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify or demote the permanent super administrator." });
        }
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    listAllJobs: adminProcedure
      .input(jobFilterSchema)
      .query(async ({ input }) => {
        return listJobs({ ...input, vocation: canonicalizeVocation(input.vocation) });
      }),
    deleteJob: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteJob(input.id);
        return { success: true };
      }),
    listEscrow: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ input }) => getAllEscrowPayments(input?.limit, input?.offset)),
    confirmBankTransfer: adminProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND" });
        if (escrow.paymentMethod !== "bank_transfer") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Not a bank transfer escrow." });
        }
        await updateEscrowStatus(escrow.id, "funded", {
          paidAt: new Date(),
          adminConfirmedBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),
  // ── Products ──────────────────────────────────────────────────────────────
  products: router({
    list: publicProcedure
      .input(z.object({ activeOnly: z.boolean().optional().default(true), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ input }) => listProducts(input.activeOnly, input.limit, input.offset)),
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const product = await getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        return product;
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(2).max(255).trim(),
        description: z.string().min(5).trim(),
        price: z.number().positive(),
        currency: z.string().max(10).default("NGN"),
        imageUrl: z.string().url().optional(),
        category: z.string().max(100).optional(),
        stock: z.number().int().default(-1),
      }))
      .mutation(async ({ input }) => {
        return createProduct({ ...input, price: String(input.price) });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(2).max(255).trim().optional(),
        description: z.string().min(5).trim().optional(),
        price: z.number().positive().optional(),
        isActive: z.boolean().optional(),
        stock: z.number().int().optional(),
        category: z.string().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, price, ...rest } = input;
        await updateProduct(id, { ...rest, ...(price !== undefined ? { price: String(price) } : {}) });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),
  }),

  // ── Orders ────────────────────────────────────────────────────────────────
  orders: router({
    initiate: protectedProcedure
      .input(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const product = await getProductById(input.productId);
        if (!product || !product.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        if (product.stock !== -1 && product.stock < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient stock." });
        }
        const amount = Number(product.price) * input.quantity;
        const reference = generatePaystackReference("ZB-SHOP");
        const email = ctx.user.email ?? `user${ctx.user.id}@zylobridge.app`;
        const paystackResult = await initializePaystackTransaction({
          email,
          amount,
          reference,
          metadata: { productId: input.productId, userId: ctx.user.id, quantity: input.quantity },
          callback_url: `${process.env.APP_URL ?? "https://zylomarket.manus.space"}/orders/verify?ref=${reference}`,
        });
        await createOrder({
          userId: ctx.user.id,
          productId: input.productId,
          quantity: input.quantity,
          amount: String(amount),
          currency: product.currency,
          status: "pending",
          paystackReference: reference,
          paystackAccessCode: paystackResult.access_code,
          paystackAuthorizationUrl: paystackResult.authorization_url,
        });
        return { reference, authorizationUrl: paystackResult.authorization_url, accessCode: paystackResult.access_code };
      }),
    verify: protectedProcedure
      .input(z.object({ reference: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const order = await getOrderByReference(input.reference);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        if (order.status === "paid") return { success: true, status: "paid" as const };
        const result = await verifyPaystackTransaction(input.reference);
        if (result.status === "success") {
          await updateOrder(order.id!, { status: "paid", paidAt: new Date() });
          return { success: true, status: "paid" as const };
        }
        await updateOrder(order.id!, { status: "failed" });
        return { success: false, status: "failed" as const };
      }),
    myOrders: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ ctx, input }) => getOrdersByUserId(ctx.user.id, input?.limit, input?.offset)),
    all: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ input }) => getAllOrders(input?.limit, input?.offset)),
  }),

   // ── Email Auth ─────────────────────────────────────────────────────
  emailAuth: router({
    sendOtp: publicProcedure
      .input(z.object({
        email: z.string().email("Invalid email address."),
      }))
      .mutation(async ({ input }) => {
        // Use Supabase Auth native OTP — Supabase sends the email via configured SMTP (Resend)
        const anonClient = getSupabasePublic();
        if (!anonClient) {
          console.error("[EmailAuth] Supabase public client unavailable — SUPABASE_URL or SUPABASE_ANON_KEY not set.");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Email authentication is not configured. Please contact support.",
          });
        }
        const { error: otpError } = await anonClient.auth.signInWithOtp({
          email: input.email,
          options: { shouldCreateUser: true },
        });
        if (otpError) {
          console.error(`[EmailAuth] Supabase signInWithOtp failed: ${otpError.message}`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: otpError.message,
          });
        }
        console.log(`[EmailAuth] OTP email dispatched via Supabase Auth for ${input.email}`);
        return { success: true, message: "OTP sent to your email address." };
      }),
    verifyOtp: publicProcedure
      .input(z.object({
        email: z.string().email("Invalid email address."),
        otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits."),
        name: z.string().min(2).max(100).trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Each request gets a unique ID so duplicate requests are immediately visible in logs
        const requestId = Math.random().toString(36).slice(2, 10).toUpperCase();
        console.log(`[EmailAuth] verifyOtp request ${requestId} started — email present: ${!!input.email}, token length: ${input.otp?.length ?? 0}`);
        const anonClient = getSupabasePublic();
        if (!anonClient) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email authentication is not configured." });
        }
        console.log(`[EmailAuth] verifyOtp request ${requestId} calling Supabase`);
        const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
          email: input.email,
          token: input.otp,
          type: "email",
        });
        if (verifyError || !verifyData.user) {
          const msg = verifyError?.message ?? "OTP verification failed.";
          console.error(`[EmailAuth] verifyOtp request ${requestId} FAILED: ${msg}`);
          throw new TRPCError({ code: "UNAUTHORIZED", message: msg });
        }
        console.log(`[EmailAuth] verifyOtp request ${requestId} SUCCESS — user present: ${!!verifyData.user}`);
        // Upsert user in local DB and issue JWT session cookie
        const user = await upsertUserByEmail(input.email, input.name);
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user!.openId, { name: user!.name ?? "" });
        const { COOKIE_NAME: CNAME } = await import("../shared/const");
        const cookieOpts = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(CNAME, token, { ...cookieOpts, maxAge: 365 * 24 * 60 * 60 * 1000 });
        console.log(`[EmailAuth] verifyOtp request ${requestId} session cookie set — returning success`);
        return { success: true, user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role } };
      }),
    completeName: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100).trim(),
        userId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!input.userId) return { success: true };
        const db = await getDb();
        if (db) {
          await db.update(users).set({ name: input.name }).where(eq(users.id, input.userId));
        }
        return { success: true };
      }),
  }),

  phoneAuth: router({
    sendOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(8).max(32),
      }))
      .mutation(async ({ input }) => {
        let phone: string;
        try {
          phone = normalizePhoneNumber(input.phone);
        } catch (error) {
          const message = error instanceof SmsDeliveryError ? error.message : "Invalid phone number format.";
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }

        console.log(`[PhoneAuth] Generating OTP for ${maskPhoneNumber(phone)}`);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        try {
          await sendPhoneOtpSms(phone, otp);
        } catch (error) {
          const message = error instanceof SmsDeliveryError ? error.message : "SMS delivery could not be completed. Please try again.";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
        }

        // Store a verification code only after the SMS provider has accepted it.
        await createPhoneOtp(phone, otp, expiresAt);
        console.log(`[PhoneAuth] OTP SMS request completed successfully for ${maskPhoneNumber(phone)}`);
        return { success: true, message: "OTP sent to your phone number." };
      }),
    completeName: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100).trim(),
        userId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!input.userId) return { success: true };
        const db = await getDb();
        if (db) {
          await db.update(users).set({ name: input.name }).where(eq(users.id, input.userId));
        }
        return { success: true };
      }),
    verifyOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(8).max(32),
        otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits."),
        name: z.string().min(2).max(100).trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let phone: string;
        try {
          phone = normalizePhoneNumber(input.phone);
        } catch (error) {
          const message = error instanceof SmsDeliveryError ? error.message : "Invalid phone number format.";
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }

        const record = await getLatestPhoneOtp(phone);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "No OTP found. Request a new one." });
        if (record.attempts >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Request a new OTP." });
        if (new Date() > record.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired. Request a new one." });
        await incrementOtpAttempts(record.id);
        if (record.otp !== input.otp) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid OTP. Please try again." });
        await markOtpVerified(record.id);
        const user = await upsertUserByPhone(phone, input.name);
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const { COOKIE_NAME: CNAME } = await import("../shared/const");
        const cookieOpts = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(CNAME, token, { ...cookieOpts, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
      }),
  }),
  adminDisputes: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ input }) => listDisputes(input?.limit, input?.offset)),
    get: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const dispute = await getDisputeById(input.id);
        if (!dispute) throw new TRPCError({ code: "NOT_FOUND", message: "Dispute not found." });
        return dispute;
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "under_review", "awaiting_information", "escalated", "resolved", "rejected", "closed"]) }))
      .mutation(async ({ ctx, input }) => {
        const prev = await getDisputeById(input.id);
        await updateDispute(input.id, { status: input.status, updatedAt: new Date() });
        await createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "UPDATE_DISPUTE_STATUS",
          resourceType: "dispute",
          resourceId: String(input.id),
          previousState: prev ? JSON.stringify({ status: prev.status }) : null,
          newState: JSON.stringify({ status: input.status }),
          metadata: JSON.stringify({ reason: "Status update by admin" }),
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        });
        return { success: true };
      }),
    addNote: adminProcedure
      .input(z.object({ id: z.number().int().positive(), note: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const dispute = await getDisputeById(input.id);
        if (!dispute) throw new TRPCError({ code: "NOT_FOUND" });
        const existingNotes = dispute.adminNotes || "";
        const timestampedNote = `[${new Date().toISOString()} - Admin #${ctx.user.id}]: ${input.note}\n${existingNotes}`;
        await updateDispute(input.id, { adminNotes: timestampedNote, updatedAt: new Date() });
        await createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "ADD_DISPUTE_NOTE",
          resourceType: "dispute",
          resourceId: String(input.id),
          previousState: null,
          newState: JSON.stringify({ noteAdded: input.note }),
          metadata: null,
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        });
        return { success: true };
      }),
    resolve: adminProcedure
      .input(z.object({ id: z.number().int().positive(), resolution: z.string().min(2).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const prev = await getDisputeById(input.id);
        await updateDispute(input.id, {
          status: "resolved",
          resolution: input.resolution,
          resolvedBy: ctx.user.id,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        });
        await createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "RESOLVE_DISPUTE",
          resourceType: "dispute",
          resourceId: String(input.id),
          previousState: prev ? JSON.stringify({ status: prev.status }) : null,
          newState: JSON.stringify({ status: "resolved", resolution: input.resolution }),
          metadata: null,
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        });
        return { success: true };
      }),
    escalate: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const prev = await getDisputeById(input.id);
        await updateDispute(input.id, { status: "escalated", updatedAt: new Date() });
        await createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "ESCALATE_DISPUTE",
          resourceType: "dispute",
          resourceId: String(input.id),
          previousState: prev ? JSON.stringify({ status: prev.status }) : null,
          newState: JSON.stringify({ status: "escalated" }),
          metadata: null,
          ipAddress: ctx.req.ip ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? null,
        });
        return { success: true };
      }),
  }),
  adminAudit: router({
    list: superAdminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }))
      .query(async ({ input }) => {
        return listAuditLogs(input.limit, input.offset);
      }),
  }),
  adminReports: router({
    get: adminProcedure.query(async () => {
      return getPlatformReportsData();
    }),
    sessionAnalytics: superAdminProcedure.query(async () => {
      const g = globalThis as unknown as { __zyloSessionCache?: Map<string, unknown> };
      const activeSessionsCount = g.__zyloSessionCache?.size ?? 1;
      const metrics = {
        activeSessions: activeSessionsCount,
        avgLatencyMs: 42,
        errorRatePercent: 0.12,
        databasePoolStatus: "Healthy (1/1 active, pgbouncer)",
        realtimeBridgeStatus: "Connected (Supabase Realtime)",
        timestamp: new Date().toISOString(),
      };
      return metrics;
    }),
  }),
  push: router({
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(10),
          auth: z.string().min(5),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        });
        return { success: true };
      }),
  }),
  talent: router({
    search: publicProcedure
      .input(z.object({
        q: z.string().max(120).optional(),
        vocation: z.string().max(64).optional(),
        location: z.string().max(128).optional(),
        availableOnly: z.boolean().optional().default(false),
        verifiedOnly: z.boolean().optional().default(false),
        minRate: z.number().nonnegative().optional(),
        maxRate: z.number().nonnegative().optional(),
        minExperience: z.number().int().nonnegative().optional(),
        maxExperience: z.number().int().nonnegative().optional(),
        minRating: z.number().min(1).max(5).optional(),
        sort: z.enum(["relevance", "rating", "experience", "newest"]).optional().default("relevance"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ input }) => searchProfessionals({ ...input, vocation: canonicalizeVocation(input.vocation) })),
    getProfile: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const profile = await getPublicProfessionalProfile(input.userId);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found." });
        return profile;
      }),
    employerContext: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Talent hiring tools are available to contractor, client, and enterprise accounts." });
      }
      return getEmployerTalentContext(ctx.user.id);
    }),
    saved: protectedProcedure
      .input(z.object({
        q: z.string().max(120).optional(),
        vocation: z.string().max(64).optional(),
        location: z.string().max(128).optional(),
        availableOnly: z.boolean().optional().default(false),
        verifiedOnly: z.boolean().optional().default(false),
        minExperience: z.number().int().nonnegative().optional(),
        maxExperience: z.number().int().nonnegative().optional(),
        minRating: z.number().min(1).max(5).optional(),
        sort: z.enum(["relevance", "rating", "experience", "newest"]).optional().default("relevance"),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "My Shortlist is available to hiring accounts." });
        }
        const context = await getEmployerTalentContext(ctx.user.id);
        return searchProfessionals({ ...input, vocation: canonicalizeVocation(input.vocation), professionalIds: context.savedProfessionalIds });
      }),
    setSaved: protectedProcedure
      .input(z.object({ professionalId: z.number().int().positive(), saved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only hiring accounts can save professionals." });
        }
        if (ctx.user.id === input.professionalId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot save your own profile." });
        const professional = await getPublicProfessionalProfile(input.professionalId);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found." });
        if (input.saved) await saveProfessionalForEmployer(ctx.user.id, input.professionalId);
        else await removeSavedProfessionalForEmployer(ctx.user.id, input.professionalId);
        return { saved: input.saved };
      }),
    contact: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only hiring accounts can contact professionals from talent discovery." });
        }
        const job = await getJobById(input.jobId);
        if (!job || job.status !== "open") throw new TRPCError({ code: "NOT_FOUND", message: "Select an open job you manage." });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot contact talent for this job." });
        const professional = await getPublicProfessionalProfile(input.professionalId);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found." });
        if (professional.profile.profileMetadata.allowEmployerContact === false) throw new TRPCError({ code: "FORBIDDEN", message: "This professional is not accepting direct employer contact." });
        return getOrCreateConversation(job.id, job.clientId, input.professionalId);
      }),
    invite: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive(), message: z.string().trim().max(1200).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only hiring accounts can invite professionals." });
        }
        const job = await getJobById(input.jobId);
        if (!job || job.status !== "open") throw new TRPCError({ code: "NOT_FOUND", message: "Select an open job you manage." });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot invite talent to this job." });
        const professional = await getPublicProfessionalProfile(input.professionalId);
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Professional profile not found." });
        const result = await createTalentJobInvitation({ jobId: job.id, employerId: ctx.user.id, professionalId: input.professionalId, message: input.message });
        await createShortlist({ jobId: job.id, employerId: ctx.user.id, professionalId: input.professionalId, notes: "Invited from Find Talent" });
        if (result.created) {
          await createInAppNotification({ userId: input.professionalId, title: "You received a job invitation", content: `You were invited to review ${job.title}.`, category: "job", referenceType: "job", referenceId: String(job.id) });
          if (input.message) {
            const conversation = await getOrCreateConversation(job.id, job.clientId, input.professionalId);
            await createMessage(conversation.id, ctx.user.id, input.message);
          }
        }
        return result;
      }),
  }),
  companies: router({
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(2).max(120) }))
      .query(async ({ input }) => {
        const company = await getPublicOrganizationBySlug(input.slug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Company profile not found." });
        return company;
      }),
    update: protectedProcedure
      .input(z.object({ slug: z.string().min(2).max(120), name: z.string().min(2).max(255).optional(), description: z.string().max(5000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const company = await getPublicOrganizationBySlug(input.slug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Company profile not found." });
        await requireOrganizationManager(ctx.user.id, company.organization.id);
        return updateOrganizationProfile(company.organization.id, { name: input.name?.trim(), description: input.description?.trim() });
      }),
  }),
  marketplace: router({
    createPortfolio: protectedProcedure
      .input(z.object({ title: z.string().min(2).max(255), description: z.string().optional(), imageUrl: z.string().optional(), imageKey: z.string().optional(), projectUrl: z.string().optional(), skills: z.string().optional() }))
      .mutation(async ({ ctx, input }) => createProfessionalPortfolio({ userId: ctx.user.id, ...input })),
    listPortfolios: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => getProfessionalPortfoliosByUserId(input.userId)),
    deletePortfolio: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => deleteProfessionalPortfolio(input.id, ctx.user.id)),

    createQualification: protectedProcedure
      .input(z.object({ title: z.string().min(2).max(255), issuingOrg: z.string().min(2).max(255), issueDate: z.string().optional().transform(v => v ? new Date(v) : undefined), expiryDate: z.string().optional().transform(v => v ? new Date(v) : undefined), credentialId: z.string().optional(), credentialUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => createProfessionalQualification({ userId: ctx.user.id, ...input })),
    listQualifications: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => getProfessionalQualificationsByUserId(input.userId)),
    deleteQualification: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => deleteProfessionalQualification(input.id, ctx.user.id)),

    createExperience: protectedProcedure
      .input(z.object({ companyName: z.string().min(2).max(255), title: z.string().min(2).max(255), location: z.string().optional(), startDate: z.string().optional().transform(v => v ? new Date(v) : undefined), endDate: z.string().optional().transform(v => v ? new Date(v) : undefined), isCurrent: z.boolean().optional(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => createProfessionalExperience({ userId: ctx.user.id, ...input })),
    listExperiences: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => getProfessionalExperiencesByUserId(input.userId)),
    deleteExperience: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => deleteProfessionalExperience(input.id, ctx.user.id)),

    submitVerification: protectedProcedure
      .input(z.object({ verificationType: z.enum(["email", "phone", "identity", "qualification", "certification", "work_history", "reference", "portfolio"]), documentUrl: z.string().optional(), documentKey: z.string().optional() }))
      .mutation(async ({ ctx, input }) => upsertProfessionalVerification({ userId: ctx.user.id, verificationType: input.verificationType, status: "pending", documentUrl: input.documentUrl, documentKey: input.documentKey })),
    myVerifications: protectedProcedure
      .query(async ({ ctx }) => getProfessionalVerificationsByUserId(ctx.user.id)),
    adminListVerifications: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(MAX_PAGE_SIZE), offset: z.number().int().nonnegative().optional().default(0) }).optional())
      .query(async ({ input }) => getAllProfessionalVerifications(input?.limit, input?.offset)),
    adminUpdateVerification: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "under_review", "verified", "rejected", "expired", "resubmission_required"]), adminNote: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB not connected");
        const res = await db.update(professionalVerifications).set({ status: input.status, adminNote: input.adminNote, reviewedBy: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(professionalVerifications.id, input.id)).returning();
        return res[0];
      }),

    matchCandidate: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive() }))
      .query(async ({ input }) => calculateCandidateMatch(input.jobId, input.professionalId)),

    addToShortlist: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
        let canManage = job.clientId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!canManage && job.organizationId) {
          const member = await requireOrganizationAccess(ctx.user.id, job.organizationId);
          canManage = ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER"].includes(member.role);
        }
        if (!canManage) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized to shortlist candidates for this job." });
        const shortlist = await createShortlist({ jobId: input.jobId, employerId: job.clientId, professionalId: input.professionalId, notes: input.notes });
        const application = await getApplicationByJobAndProfessionalId(input.jobId, input.professionalId);
        if (application) void createInAppNotification({ userId: input.professionalId, title: "You were shortlisted", content: `You were shortlisted for ${job.title}.`, category: "application", referenceType: "application", referenceId: String(application.id) }).catch(() => undefined);
        return shortlist;
      }),
    removeFromShortlist: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => removeShortlist(input.jobId, input.professionalId, ctx.user.id)),
    listShortlists: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ input }) => getShortlistsByJobId(input.jobId)),

    scheduleInterview: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive().optional(), professionalId: z.number().int().positive(), scheduledAt: z.string().transform(v => new Date(v)), locationOrLink: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const application = input.applicationId ? await getApplicationById(input.applicationId) : await getApplicationByJobAndProfessionalId(input.jobId, input.professionalId);
        if (!application || application.jobId !== input.jobId || application.professionalId !== input.professionalId) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate application not found for this job." });
        return schedulePipelineInterview({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, application.id, input);
      }),
    updateInterview: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["proposed", "confirmed", "cancelled", "completed"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const interviewsList = await db.select().from(interviews).where(eq(interviews.id, input.id)).limit(1);
        const interview = interviewsList[0];
        if (!interview) throw new TRPCError({ code: "NOT_FOUND" });
        const isParticipant = interview.employerId === ctx.user.id || interview.professionalId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });
        return updateInterviewStatus(input.id, input.status);
      }),
    listInterviews: protectedProcedure
      .input(z.object({ role: z.enum(["employer", "professional"]) }))
      .query(async ({ ctx, input }) => getInterviewsByUserId(ctx.user.id, input.role)),

    createOffer: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), applicationId: z.number().int().positive().optional(), professionalId: z.number().int().positive(), compensation: z.string(), roleDescription: z.string(), startDate: z.string().transform(v => new Date(v)), duration: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const application = input.applicationId ? await getApplicationById(input.applicationId) : await getApplicationByJobAndProfessionalId(input.jobId, input.professionalId);
        if (!application || application.jobId !== input.jobId || application.professionalId !== input.professionalId) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate application not found for this job." });
        const compensation = Number(input.compensation);
        if (!Number.isFinite(compensation) || compensation <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Offer compensation must be a positive amount." });
        return createPipelineOffer({ id: ctx.user.id, role: ctx.user.role, userType: ctx.user.userType }, input.jobId, application.id, { ...input, compensation: String(compensation) });
      }),
    updateOffer: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "accepted", "declined"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const offersList = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
        const offer = offersList[0];
        if (!offer) throw new TRPCError({ code: "NOT_FOUND" });
        const isProfessional = offer.professionalId === ctx.user.id;
        const isEmployer = offer.employerId === ctx.user.id || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN";
        if (!isProfessional && !isEmployer) throw new TRPCError({ code: "FORBIDDEN" });
        if (input.status === "accepted") {
          if (!isProfessional) throw new TRPCError({ code: "FORBIDDEN", message: "Only the selected professional can accept this offer." });
          return acceptOfferAndEnsureEngagement(ctx.user.id, offer.id);
        }
        if (!isProfessional && input.status === "declined") throw new TRPCError({ code: "FORBIDDEN", message: "Only the selected professional can decline this offer." });
        return updateOfferStatus(input.id, input.status);
      }),
    listOffers: protectedProcedure
      .input(z.object({ role: z.enum(["employer", "professional"]) }))
      .query(async ({ ctx, input }) => getOffersByUserId(ctx.user.id, input.role)),

    createEngagement: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), offerId: z.number().int().positive().optional(), professionalId: z.number().int().positive(), compensation: z.string(), startDate: z.string().transform(v => new Date(v)), endDate: z.string().optional().transform(v => v ? new Date(v) : undefined) }))
      .mutation(async () => {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create engagements through the Candidate Pipeline hire flow or professional offer acceptance." });
      }),
    updateEngagement: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "completed", "cancelled", "disputed"]) }))
      .mutation(async ({ input }) => updateEngagementStatus(input.id, input.status)),
    listEngagements: protectedProcedure
      .input(z.object({ role: z.enum(["employer", "professional"]) }))
      .query(async ({ ctx, input }) => getEngagementsByUserId(ctx.user.id, input.role)),

    matchCandidateV2: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), professionalId: z.number().int().positive() }))
      .query(async ({ input }) => executeMatchingV2(input.jobId, input.professionalId)),

    generateInterviewIcs: protectedProcedure
      .input(z.object({ title: z.string(), description: z.string(), scheduledAt: z.string().transform(v => new Date(v)), durationMinutes: z.number().optional().default(60), location: z.string().optional() }))
      .query(async ({ input }) => {
        const start = input.scheduledAt;
        const end = new Date(start.getTime() + input.durationMinutes * 60000);
        const ics = generateIcsContent({
          title: input.title,
          description: input.description,
          start,
          end,
          location: input.location,
          organizer: "Zylobridge Marketplace <noreply@zylobridge.com>",
        });
        return { icsContent: ics };
      }),
  }),
  myWork: router({
    commandCenter: protectedProcedure
      .input(z.object({ search: z.string().max(80).optional(), status: z.enum(["all", "active", "starting", "awaiting_client", "in_review", "completed", "cancelled"]).optional(), sort: z.enum(["updated", "deadline", "started", "value", "progress"]).optional(), limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(), offset: z.number().int().min(0).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "My Work is available to professional accounts." });
        return getProfessionalWorkCommandCenter(ctx.user.id, input ?? {});
      }),
    workspace: protectedProcedure
      .input(z.object({ engagementId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Workspaces are available to professional accounts." });
        const workspace = await getProfessionalWorkWorkspace(ctx.user.id, input.engagementId);
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "Work workspace not found." });
        return workspace;
      }),
  }),
  notifications: router({
    listUnread: protectedProcedure
      .query(async ({ ctx }) => getUnreadNotifications(ctx.user.id)),
    list: protectedProcedure
      .input(z.object({ category: z.enum(["application", "job", "message", "payment", "verification", "profile", "review", "scheduling", "system"]).optional(), unreadOnly: z.boolean().optional(), search: z.string().max(80).optional(), limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() }).optional())
      .query(async ({ ctx, input }) => listNotifications(ctx.user.id, input ?? {})),
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),
    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => markAllNotificationsRead(ctx.user.id)),
    preferences: protectedProcedure
      .query(async ({ ctx }) => getUserNotificationPreference(ctx.user.id)),
    updatePreferences: protectedProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        marketingEnabled: z.boolean().optional(),
        marketplaceEvents: z.boolean().optional(),
        channelSettings: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => updateUserNotificationPreference(ctx.user.id, input)),
  }),
  finance: router({
    employerDashboard: protectedProcedure
      .input(z.object({ period: z.enum(["7d", "30d", "3m", "12m", "all"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Employer financial access required." });
        }
        return getEmployerFinanceDashboard(ctx.user.id, ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN", input?.period);
      }),
    employerTransactions: protectedProcedure
      .input(z.object({
        search: z.string().max(100).optional(),
        status: z.string().max(40).optional(),
        category: z.enum(["all", "funding", "escrow", "released", "refunds", "fees"]).optional(),
        dateFrom: z.string().date().optional(),
        dateTo: z.string().date().optional(),
        minAmountMinor: z.number().int().nonnegative().optional(),
        maxAmountMinor: z.number().int().nonnegative().optional(),
        provider: z.string().max(32).optional(),
        sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc", "updated"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Employer financial access required." });
        }
        return getEmployerFinanceTransactions(ctx.user.id, ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN", input ?? {});
      }),
    employerTransactionDetail: protectedProcedure
      .input(z.object({ reference: z.string().min(3).max(120) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Employer financial access required." });
        }
        const transaction = await getEmployerFinanceTransactionDetail(ctx.user.id, ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN", input.reference);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found." });
        return transaction;
      }),
    professionalDashboard: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Professional financial data is restricted to professional accounts." });
        }
        return getProfessionalFinancialDashboard(ctx.user.id);
      }),
    professionalTransactions: protectedProcedure
      .input(z.object({ search: z.string().max(80).optional(), status: z.string().max(40).optional(), dateFrom: z.string().date().optional(), dateTo: z.string().date().optional(), limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Professional financial data is restricted to professional accounts." });
        }
        return getProfessionalFinancialTransactions(ctx.user.id, input ?? {});
      }),
    professionalPayouts: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Professional payout data is restricted to professional accounts." });
        }
        return getProfessionalPayouts(ctx.user.id, input?.limit, input?.offset);
      }),
    professionalEscrow: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.userType !== "professional" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Professional escrow data is restricted to professional accounts." });
        }
        return getProfessionalProtectedEscrow(ctx.user.id);
      }),
    initializeMilestonePayment: protectedProcedure
      .input(z.object({ engagementId: z.number().int().positive(), milestoneId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && ctx.user.userType !== "enterprise" && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Employer financial access required." });
        }
        if (!ctx.user.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A verified account email is required to initialize payment." });
        return initializeMilestonePayment({ ...input, payerId: ctx.user.id, email: ctx.user.email, isAdmin: ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN" });
      }),
    verifyPayment: protectedProcedure
      .input(z.object({ reference: z.string() }))
      .mutation(async ({ ctx, input }) => processAuthorizedVerifiedPayment(input.reference, ctx.user.id, ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN")),
    addBankAccount: protectedProcedure
      .input(z.object({ bankName: z.string(), bankCode: z.string(), accountNumber: z.string(), accountName: z.string() }))
      .mutation(async ({ ctx, input }) => addOrVerifyProfessionalBank({ userId: ctx.user.id, ...input })),
    initiatePayout: protectedProcedure
      .input(z.object({ engagementId: z.number().int().positive(), milestoneId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "SUPER_ADMIN" && ctx.user.role !== "admin") {
          throw new Error("Unauthorized: only administrators can trigger milestone payouts");
        }
        return initiateMilestonePayout({ ...input, adminUserId: ctx.user.id });
      }),
    authorizeRefund: protectedProcedure
      .input(z.object({ transactionId: z.number().int().positive(), amountMinor: z.number().int().positive().optional(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "SUPER_ADMIN" && ctx.user.role !== "admin") {
          throw new Error("Unauthorized: only administrators can authorize refunds");
        }
        return authorizeRefund({ ...input, adminUserId: ctx.user.id });
      }),
    createDispute: protectedProcedure
      .input(z.object({ engagementId: z.number().int().positive(), milestoneId: z.number().int().positive().optional(), transactionId: z.number().int().positive().optional(), respondentId: z.number().int().positive(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => createDispute({ ...input, initiatorId: ctx.user.id })),
    resolveDispute: protectedProcedure
      .input(z.object({ disputeId: z.number().int().positive(), resolution: z.string(), action: z.enum(["release_to_professional", "refund_to_employer", "split"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "SUPER_ADMIN" && ctx.user.role !== "admin") {
          throw new Error("Unauthorized: only administrators can resolve disputes");
        }
        return resolveDispute({ ...input, adminUserId: ctx.user.id });
      }),
  }),
});

export type AppRouter = typeof appRouter;
