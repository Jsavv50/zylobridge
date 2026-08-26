import { getSupabaseAdmin, getSupabasePublic } from "./_core/supabase";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { COOKIE_NAME } from "../shared/const";
import { VOCATION_KEYS } from "../shared/vocations";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import { sendOrganizationInviteEmail } from "./email";
import { getFrontendUrl } from "./_core/env";
import {
  upsertUser,
  getUserByOpenId,
  getUserById,
  updateUserType,
  updateUserRole,
  updateUserName,
  getAllUsers,
  getUserCount,
  createJob,
  getJobById,
  listJobs,
  getJobsByClientId,
  updateJob,
  deleteJob,
  getJobCount,
  createApplication,
  getApplicationById,
  getApplicationsByJobId,
  getApplicationsByProfessionalId,
  getApplicationForJobAndProfessional,
  updateApplicationStatus,
  getApplicationCount,
  createProfile,
  getProfileByUserId,
  updateProfile,
  createReview,
  getReviewsByRevieweeId,
  getAdminStats,
  getOrCreateConversation,
  getConversationsByUserId,
  getConversationById,
  getMessagesByConversationId,
  markMessagesReadByParticipant,
  getUnreadMessageCount,
  createEscrowPayment,
  getEscrowByJobId,
  getEscrowByReference,
  updateEscrowStatus,
  getAllEscrowPayments,
  createVerificationRequest,
  getVerificationRequestsByUserId,
  getVerificationRequestById,
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
  getOrganizationById,
  getOrganizationMembership,
  getOrganizationsForUser,
  createOrganizationWithOwner,
  updateOrganization,
  listOrganizationMembers,
  updateOrganizationMember,
  createOrganizationInvitation,
  getOrganizationInvitationByTokenHash,
  listOrganizationInvitations,
  updateOrganizationInvitation,
  createOrganizationVerificationRequest,
  listOrganizationVerificationRequests,
  getOrganizationVerificationRequestById,
  updateOrganizationVerificationRequest,
  activateOrganizationMember,
  createOrganizationProject,
  listOrganizationProjects,
  updateOrganizationProject,
  getOrganizationProjectById,
  getOrganizationJobs,
  createWorkforceAssignment,
  listWorkforceAssignments,
  updateWorkforceAssignment,
  createNotification,
  createAuditLog,
} from "./db";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  listPaystackBanks,
  resolveAccountNumber,
  generatePaystackReference,
} from "./paystack";

// ── Admin guard ────────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

const isPlatformAdmin = (role: string) => role === "admin" || role === "SUPER_ADMIN";
const organizationRoleSchema = z.enum(["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER", "PROJECT_MANAGER", "FINANCE_MANAGER", "VIEWER", "MEMBER"]);
const organizationManagerRoles = ["OWNER", "ADMIN"] as const;
const organizationHiringRoles = ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER", "PROJECT_MANAGER"] as const;
const vocationSchema = z.string().refine(
  (value) => VOCATION_KEYS.includes(value as (typeof VOCATION_KEYS)[number]),
  "Select a supported vocation.",
);

async function requireOrganizationAccess(
  ctx: { user: { id: number; role: string } },
  organizationId: number,
  allowedRoles?: readonly string[],
) {
  const organization = await getOrganizationById(organizationId);
  if (!organization) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  if (isPlatformAdmin(ctx.user.role)) return { organization, membership: null };
  const membership = await getOrganizationMembership(organizationId, ctx.user.id);
  if (!membership || membership.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Organization access is required." });
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your organization role does not permit this action." });
  }
  return { organization, membership };
}

// ── Input schemas ──────────────────────────────────────────────────────────────
const jobFilterSchema = z.object({
  vocation: vocationSchema.optional(),
  location: z.string().max(128).optional(),
  status: z.enum(["draft", "open", "paused", "in_progress", "completed", "cancelled", "closed"]).optional(),
  minBudget: z.number().nonnegative().optional(),
  maxBudget: z.number().nonnegative().optional(),
  limit: z.number().int().min(1).max(200).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

const jobCreateSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  vocation: vocationSchema,
  budget: z.number().positive(),
  location: z.string().min(2).max(200).trim(),
  deadline: z.string().optional(),
  isUrgent: z.boolean().optional().default(false),
});

const profileUpdateSchema = z.object({
  vocation: vocationSchema.optional(),
  bio: z.string().max(2000).trim().optional(),
  skills: z.string().max(1000).trim().optional(),
  certifications: z.string().max(1000).trim().optional(),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  hourlyRate: z.number().positive().optional(),
  location: z.string().max(200).trim().optional(),
  yearsExperience: z.number().int().nonnegative().max(60).optional(),
  isAvailable: z.boolean().optional(),
});

const reviewCreateSchema = z.object({
  jobId: z.number().int().positive(),
  revieweeId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).trim().optional(),
});

export const appRouter = router({
  system: systemRouter,

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
  }),

  // ── Enterprise organizations ──────────────────────────────────────────────
  enterprise: router({
    myOrganizations: protectedProcedure.query(async ({ ctx }) => getOrganizationsForUser(ctx.user.id)),

    createOrganization: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(255).trim(),
        description: z.string().max(4000).trim().optional(),
        industry: z.string().max(160).trim().optional(),
        companySize: z.string().max(80).trim().optional(),
        yearEstablished: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
        website: z.string().url().max(500).optional().or(z.literal("")),
        businessEmail: z.string().email().max(320).optional().or(z.literal("")),
        businessPhone: z.string().max(40).trim().optional(),
        location: z.string().max(255).trim().optional(),
        operatingRegions: z.array(z.string().min(2).max(120)).max(40).optional().default([]),
        socialLinks: z.record(z.string().max(40), z.string().url().max(500)).optional().default({}),
      }))
      .mutation(async ({ ctx, input }) => {
        const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "organization";
        const slug = `${slugBase}-${randomBytes(4).toString("hex")}`;
        const organization = await createOrganizationWithOwner({
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          industry: input.industry,
          companySize: input.companySize,
          yearEstablished: input.yearEstablished,
          website: input.website || null,
          businessEmail: input.businessEmail || null,
          businessPhone: input.businessPhone,
          location: input.location,
          operatingRegions: input.operatingRegions,
          socialLinks: input.socialLinks,
          verificationStatus: "pending",
        }, ctx.user.id);
        await updateUserType(ctx.user.id, "enterprise");
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.created", resourceType: "organization", resourceId: String(organization.id), metadata: { name: organization.name } });
        return organization;
      }),

    getOrganization: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => (await requireOrganizationAccess(ctx, input.organizationId)).organization),

    updateOrganization: protectedProcedure
      .input(z.object({
        organizationId: z.number().int().positive(),
        name: z.string().min(2).max(255).trim().optional(),
        description: z.string().max(4000).trim().optional(),
        industry: z.string().max(160).trim().optional(),
        companySize: z.string().max(80).trim().optional(),
        yearEstablished: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
        website: z.string().url().max(500).optional().or(z.literal("")),
        businessEmail: z.string().email().max(320).optional().or(z.literal("")),
        businessPhone: z.string().max(40).trim().optional(),
        location: z.string().max(255).trim().optional(),
        operatingRegions: z.array(z.string().min(2).max(120)).max(40).optional(),
        socialLinks: z.record(z.string().max(40), z.string().url().max(500)).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
        const { organizationId, website, businessEmail, ...changes } = input;
        const organization = await updateOrganization(organizationId, {
          ...changes,
          ...(website !== undefined ? { website: website || null } : {}),
          ...(businessEmail !== undefined ? { businessEmail: businessEmail || null } : {}),
        });
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.updated", resourceType: "organization", resourceId: String(organizationId) });
        return organization;
      }),

    dashboard: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { organization, membership } = await requireOrganizationAccess(ctx, input.organizationId);
        const [members, invitations, projects, jobs, workforce] = await Promise.all([
          listOrganizationMembers(input.organizationId),
          listOrganizationInvitations(input.organizationId),
          listOrganizationProjects(input.organizationId),
          getOrganizationJobs(input.organizationId),
          listWorkforceAssignments(input.organizationId),
        ]);
        return {
          organization,
          membership,
          metrics: {
            activeMembers: members.filter((entry) => entry.member.status === "active").length,
            pendingInvitations: invitations.filter((invite) => invite.status === "pending" && invite.expiresAt > new Date()).length,
            activeProjects: projects.filter((project) => project.status === "active").length,
            openJobs: jobs.filter((job) => job.status === "open").length,
            activeWorkforce: workforce.filter((entry) => entry.assignment.status === "active" || entry.assignment.status === "assigned").length,
          },
        };
      }),

    members: router({
      list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId);
        return listOrganizationMembers(input.organizationId);
      }),
      invite: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), email: z.string().email().max(320), role: organizationRoleSchema }))
        .mutation(async ({ ctx, input }) => {
          const { organization } = await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
          if (input.role === "OWNER") throw new TRPCError({ code: "BAD_REQUEST", message: "Ownership cannot be assigned by invitation." });
          const rawToken = randomBytes(32).toString("base64url");
          const tokenHash = createHash("sha256").update(rawToken).digest("hex");
          const invitation = await createOrganizationInvitation({
            organizationId: input.organizationId,
            inviterUserId: ctx.user.id,
            email: input.email.toLowerCase(),
            role: input.role,
            tokenHash,
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          const inviteUrl = `${getFrontendUrl()}/enterprise/invitations/${rawToken}`;
          let emailDelivered = true;
          try {
            await sendOrganizationInviteEmail({ to: input.email, organizationName: organization.name, role: input.role, inviteUrl });
          } catch (error) {
            emailDelivered = false;
            console.error("[Enterprise] invitation email delivery failed", error instanceof Error ? error.message : "unknown error");
          }
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.member_invited", resourceType: "organization_invitation", resourceId: String(invitation?.id ?? ""), metadata: { organizationId: input.organizationId, role: input.role } });
          return { invitation, emailDelivered };
        }),
      acceptInvitation: protectedProcedure
        .input(z.object({ token: z.string().min(32).max(200) }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "An email address is required to accept an organization invitation." });
          const tokenHash = createHash("sha256").update(input.token).digest("hex");
          const invitation = await getOrganizationInvitationByTokenHash(tokenHash);
          if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
            throw new TRPCError({ code: "NOT_FOUND", message: "This invitation is invalid or expired." });
          }
          if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sign in with the email address that received this invitation." });
          }
          await activateOrganizationMember(invitation.organizationId, ctx.user.id, invitation.role);
          await updateOrganizationInvitation(invitation.id, { status: "accepted", acceptedByUserId: ctx.user.id, acceptedAt: new Date() });
          await updateUserType(ctx.user.id, "enterprise");
          await createNotification({ userId: invitation.inviterUserId, title: "Invitation accepted", content: "A team invitation has been accepted.", category: "organization", referenceType: "organization", referenceId: String(invitation.organizationId) });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.invitation_accepted", resourceType: "organization_invitation", resourceId: String(invitation.id), metadata: { organizationId: invitation.organizationId } });
          return { success: true, organizationId: invitation.organizationId };
        }),
      updateMember: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), memberId: z.number().int().positive(), role: organizationRoleSchema.optional(), status: z.enum(["active", "suspended", "removed"]).optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
          const members = await listOrganizationMembers(input.organizationId);
          const target = members.find((entry) => entry.member.id === input.memberId)?.member;
          if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Organization member not found." });
          if (target.role === "OWNER") throw new TRPCError({ code: "BAD_REQUEST", message: "The organization owner cannot be changed here." });
          if (input.role === "OWNER") throw new TRPCError({ code: "BAD_REQUEST", message: "Ownership transfer requires a dedicated review workflow." });
          const member = await updateOrganizationMember(input.memberId, { ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.member_updated", resourceType: "organization_member", resourceId: String(input.memberId), metadata: { organizationId: input.organizationId } });
          return member;
        }),
    }),

    verification: router({
      submit: protectedProcedure
        .input(z.object({
          organizationId: z.number().int().positive(),
          documentType: z.enum(["business_registration", "tax_certificate", "insurance_certificate", "trade_licence", "other"]),
          fileBase64: z.string().min(1),
          fileName: z.string().min(1).max(255),
          mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
          const buffer = Buffer.from(input.fileBase64, "base64");
          if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
            throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Verification documents must be between 1 byte and 10 MB." });
          }
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `organization-verification/${input.organizationId}/${Date.now()}-${safeName}`;
          await storagePut(key, buffer, input.mimeType);
          const request = await createOrganizationVerificationRequest({ organizationId: input.organizationId, submittedByUserId: ctx.user.id, documentType: input.documentType, documentKey: key, status: "pending" });
          await updateOrganization(input.organizationId, { verificationStatus: "pending", verificationNote: null, verificationReviewedAt: null, verificationReviewedBy: null });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.verification_submitted", resourceType: "organization_verification_request", resourceId: String(request?.id ?? ""), metadata: { organizationId: input.organizationId, documentType: input.documentType } });
          return { success: true, requestId: request?.id };
        }),
      myRequests: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
          return listOrganizationVerificationRequests(input.organizationId);
        }),
      getDocumentAccessUrl: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), requestId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationManagerRoles);
          const request = await getOrganizationVerificationRequestById(input.requestId);
          if (!request || request.organizationId !== input.organizationId) throw new TRPCError({ code: "NOT_FOUND" });
          return { url: await storageGetSignedUrl(request.documentKey) };
        }),
      adminReview: adminProcedure
        .input(z.object({ requestId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), adminNote: z.string().max(1000).trim().optional() }))
        .mutation(async ({ ctx, input }) => {
          const request = await getOrganizationVerificationRequestById(input.requestId);
          if (!request) throw new TRPCError({ code: "NOT_FOUND" });
          await updateOrganizationVerificationRequest(input.requestId, { status: input.status, adminNote: input.adminNote, reviewedAt: new Date(), reviewedBy: ctx.user.id });
          await updateOrganization(request.organizationId, { verificationStatus: input.status, verificationNote: input.adminNote, verificationReviewedAt: new Date(), verificationReviewedBy: ctx.user.id });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.verification_reviewed", resourceType: "organization_verification_request", resourceId: String(input.requestId), metadata: { organizationId: request.organizationId, status: input.status } });
          return { success: true };
        }),
    }),

    projects: router({
      list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId);
        return listOrganizationProjects(input.organizationId);
      }),
      create: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), name: z.string().min(2).max(255).trim(), description: z.string().max(4000).trim().optional(), location: z.string().max(255).trim().optional(), budget: z.number().nonnegative().optional(), startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
          const project = await createOrganizationProject({ organizationId: input.organizationId, createdById: ctx.user.id, name: input.name, description: input.description, location: input.location, budget: input.budget !== undefined ? String(input.budget) : undefined, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined, status: "active" });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.project_created", resourceType: "organization_project", resourceId: String(project?.id ?? ""), metadata: { organizationId: input.organizationId } });
          return project;
        }),
      update: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), projectId: z.number().int().positive(), name: z.string().min(2).max(255).trim().optional(), description: z.string().max(4000).trim().optional(), location: z.string().max(255).trim().optional(), budget: z.number().nonnegative().optional(), startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional(), status: z.enum(["active", "archived"]).optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
          const project = await getOrganizationProjectById(input.projectId);
          if (!project || project.organizationId !== input.organizationId) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
          const { organizationId, projectId, startDate, endDate, budget, ...changes } = input;
          return updateOrganizationProject(projectId, { ...changes, ...(budget !== undefined ? { budget: String(budget) } : {}), ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}), ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}) });
        }),
    }),

    jobs: router({
      list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId);
        return getOrganizationJobs(input.organizationId);
      }),
      create: protectedProcedure
        .input(jobCreateSchema.extend({ organizationId: z.number().int().positive(), projectId: z.number().int().positive().optional(), status: z.enum(["draft", "open"]).default("draft") }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
          if (input.projectId) {
            const project = await getOrganizationProjectById(input.projectId);
            if (!project || project.organizationId !== input.organizationId) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected project does not belong to this organization." });
          }
          await createJob({ clientId: ctx.user.id, organizationId: input.organizationId, projectId: input.projectId, title: input.title, description: input.description, vocation: input.vocation as any, budget: String(input.budget), location: input.location, deadline: input.deadline ? new Date(input.deadline) : undefined, isUrgent: input.isUrgent, status: input.status });
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.job_created", resourceType: "job", metadata: { organizationId: input.organizationId, projectId: input.projectId ?? null } });
          return { success: true };
        }),
    }),

    candidates: router({
      listForJob: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), jobId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
        const job = await getJobById(input.jobId);
        if (!job || job.organizationId !== input.organizationId) throw new TRPCError({ code: "NOT_FOUND", message: "Organization job not found." });
        return getApplicationsByJobId(input.jobId);
      }),
      updateStatus: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), applicationId: z.number().int().positive(), status: z.enum(["under_review", "shortlisted", "interview", "accepted", "hired", "rejected"]) }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
          const application = await getApplicationById(input.applicationId);
          if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
          const job = await getJobById(application.jobId);
          if (!job || job.organizationId !== input.organizationId) throw new TRPCError({ code: "FORBIDDEN" });
          await updateApplicationStatus(application.id, input.status as any);
          if (input.status === "hired") {
            await updateJob(job.id, { status: "in_progress", assignedProfessionalId: application.professionalId });
            await createWorkforceAssignment({ organizationId: input.organizationId, projectId: job.projectId, jobId: job.id, professionalId: application.professionalId, assignedByUserId: ctx.user.id, status: "assigned" });
          }
          await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "organization.candidate_status_updated", resourceType: "application", resourceId: String(application.id), metadata: { organizationId: input.organizationId, status: input.status } });
          return { success: true };
        }),
    }),

    workforce: router({
      list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await requireOrganizationAccess(ctx, input.organizationId);
        return listWorkforceAssignments(input.organizationId);
      }),
      update: protectedProcedure
        .input(z.object({ organizationId: z.number().int().positive(), assignmentId: z.number().int().positive(), status: z.enum(["assigned", "active", "completed", "removed"]), startedAt: z.string().datetime().optional(), endedAt: z.string().datetime().optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireOrganizationAccess(ctx, input.organizationId, organizationHiringRoles);
          const assignment = await updateWorkforceAssignment(input.assignmentId, { status: input.status, ...(input.startedAt ? { startedAt: new Date(input.startedAt) } : {}), ...(input.endedAt ? { endedAt: new Date(input.endedAt) } : {}) });
          if (!assignment || assignment.organizationId !== input.organizationId) throw new TRPCError({ code: "NOT_FOUND", message: "Workforce assignment not found." });
          return assignment;
        }),
    }),
  }),

  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: router({
    list: publicProcedure.input(jobFilterSchema).query(async ({ input }) => {
      return listJobs(input);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        return job;
      }),

    myJobs: protectedProcedure.query(async ({ ctx }) => {
      return getJobsByClientId(ctx.user.id);
    }),

    create: protectedProcedure.input(jobCreateSchema).mutation(async ({ ctx, input }) => {
      if (ctx.user.userType !== "client" && !isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can post jobs." });
      }
      await createJob({
        clientId: ctx.user.id,
        title: input.title,
        description: input.description,
        vocation: input.vocation as any,
        budget: String(input.budget),
        location: input.location,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        isUrgent: input.isUrgent ?? false,
        status: "open",
      });
      return { success: true };
    }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "open", "paused", "in_progress", "completed", "cancelled", "closed"]) }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateJob(input.id, { status: input.status });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteJob(input.id);
        return { success: true };
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
        await createApplication({
          jobId: input.jobId,
          professionalId: ctx.user.id,
          coverLetter: input.coverLetter,
          bidAmount: String(input.bidAmount),
          status: "pending",
        });
        return { success: true };
      }),

    listForJob: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getApplicationsByJobId(input.jobId);
      }),

    myApplications: protectedProcedure.query(async ({ ctx }) => {
      return getApplicationsByProfessionalId(ctx.user.id);
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
          if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
          if (input.status === "accepted") {
            await updateJob(app.jobId, { status: "in_progress", assignedProfessionalId: app.professionalId });
          }
        }
        await updateApplicationStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ── Profiles ──────────────────────────────────────────────────────────────
  profiles: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return getProfileByUserId(ctx.user.id);
    }),
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getProfileByUserId(input.userId);
      }),
    upsert: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
      const existing = await getProfileByUserId(ctx.user.id);
      if (existing) {
        await updateProfile(ctx.user.id, {
          ...input,
          vocation: input.vocation as any,
          hourlyRate: input.hourlyRate !== undefined ? String(input.hourlyRate) : undefined,
        });
      } else {
        if (!input.vocation) throw new TRPCError({ code: "BAD_REQUEST", message: "Vocation required." });
        await createProfile({
          userId: ctx.user.id,
          vocation: input.vocation as any,
          bio: input.bio,
          skills: input.skills,
          certifications: input.certifications,
          portfolioUrl: input.portfolioUrl,
          hourlyRate: input.hourlyRate !== undefined ? String(input.hourlyRate) : undefined,
          location: input.location,
          yearsExperience: input.yearsExperience,
          isAvailable: input.isAvailable ?? true,
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
      if (job.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reviews are available after a completed job." });
      }
      if (input.revieweeId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot review yourself." });
      }
      const isClientReviewingAssignedProfessional = job.clientId === ctx.user.id && job.assignedProfessionalId === input.revieweeId;
      const isProfessionalReviewingClient = job.assignedProfessionalId === ctx.user.id && job.clientId === input.revieweeId;
      if (!isClientReviewingAssignedProfessional && !isProfessionalReviewingClient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only completed-job participants can review one another." });
      }
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
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getReviewsByRevieweeId(input.userId);
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
        if (isClient) {
          if (input.otherUserId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST" });
          const application = await getApplicationForJobAndProfessional(input.jobId, input.otherUserId);
          if (!application && job.assignedProfessionalId !== input.otherUserId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Conversations are limited to applicants and assigned professionals." });
          }
          return getOrCreateConversation(input.jobId, ctx.user.id, input.otherUserId);
        }

        const application = await getApplicationForJobAndProfessional(input.jobId, ctx.user.id);
        const isEligibleProfessional = job.assignedProfessionalId === ctx.user.id || Boolean(application);
        if (!isEligibleProfessional || input.otherUserId !== job.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Conversations are limited to the job owner and eligible professionals." });
        }
        return getOrCreateConversation(input.jobId, job.clientId, ctx.user.id);
      }),

    myConversations: protectedProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user.id);
    }),

    getMessages: protectedProcedure
      .input(z.object({
        conversationId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversationById(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        if (conversation.clientId !== ctx.user.id && conversation.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getMessagesByConversationId(input.conversationId, input.limit);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await getUnreadMessageCount(ctx.user.id) };
    }),
  }),

  // ── Escrow Payments ───────────────────────────────────────────────────────
  escrow: router({
    // Initialize Paystack payment
    initPaystack: protectedProcedure
      .input(z.object({
        jobId: z.number().int().positive(),
        professionalId: z.number().int().positive(),
        amount: z.number().positive(),
        callbackUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userType !== "client" && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can fund escrow." });
        }
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
        if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        if (job.assignedProfessionalId !== input.professionalId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow can only be funded for the job's assigned professional." });
        }
        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required for payment." });
        }
        const existing = await getEscrowByJobId(input.jobId);
        if (existing && existing.status === "funded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already funded for this job." });
        }
        const reference = generatePaystackReference("ZB-ESC");
        const result = await initializePaystackTransaction({
          email: ctx.user.email,
          amount: input.amount,
          reference,
          metadata: { jobId: input.jobId, clientId: ctx.user.id, professionalId: input.professionalId },
          callback_url: input.callbackUrl,
        });
        await createEscrowPayment({
          jobId: input.jobId,
          clientId: ctx.user.id,
          professionalId: input.professionalId,
          amount: String(input.amount),
          currency: "NGN",
          paymentMethod: "paystack",
          status: "pending",
          paystackReference: reference,
          paystackAccessCode: result.access_code,
          paystackAuthorizationUrl: result.authorization_url,
        });
        return { authorizationUrl: result.authorization_url, reference };
      }),

    // Verify Paystack payment after redirect
    verifyPaystack: protectedProcedure
      .input(z.object({ reference: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const escrow = await getEscrowByReference(input.reference);
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND", message: "Escrow record not found." });
        if (escrow.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await verifyPaystackTransaction(input.reference);
        if (result.status !== "success") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not successful." });
        }
        await updateEscrowStatus(escrow.id, "funded", { paidAt: new Date() });
        return { success: true, amount: result.amount / 100 };
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
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Bank-transfer escrow is not enabled until a verified settlement account is configured.",
          });
        }
        if (ctx.user.userType !== "client" && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can fund escrow." });
        }
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
        if (job.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        if (job.assignedProfessionalId !== input.professionalId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow can only be funded for the job's assigned professional." });
        }
        const existing = await getEscrowByJobId(input.jobId);
        if (existing && existing.status === "funded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already funded." });
        }
        await createEscrowPayment({
          jobId: input.jobId,
          clientId: ctx.user.id,
          professionalId: input.professionalId,
          amount: String(input.amount),
          currency: "NGN",
          paymentMethod: "bank_transfer",
          status: "pending",
          bankAccountNumber: input.bankAccountNumber,
          bankAccountName: input.bankAccountName,
          bankName: input.bankName,
        });
        return {
          success: true,
          instructions: {
            bankName: "Zenith Bank",
            accountNumber: "1234567890",
            accountName: "ZYLOBRIDGE ESCROW SERVICES LTD",
            amount: input.amount,
            narration: `ZYLOBRIDGE-JOB-${input.jobId}`,
          },
        };
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
        return { success: true };
      }),

    getTransferProofAccessUrl: adminProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow?.transferProofKey) throw new TRPCError({ code: "NOT_FOUND", message: "Transfer proof not found." });
        return { url: await storageGetSignedUrl(escrow.transferProofKey) };
      }),

    // Get escrow for a job
    getByJobId: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const escrow = await getEscrowByJobId(input.jobId);
        if (!escrow) return null;
        if (escrow.clientId !== ctx.user.id && escrow.professionalId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
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
        if (escrow.clientId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
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

    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return getVerificationRequestsByUserId(ctx.user.id);
    }),

    getDocumentAccessUrl: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const request = await getVerificationRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Verification request not found." });
        return { url: await storageGetSignedUrl(request.documentKey) };
      }),

    // Admin: list all pending
    adminList: adminProcedure.query(async () => {
      return getAllVerificationRequests();
    }),

    // Admin: approve or reject
    adminReview: adminProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        adminNote: z.string().max(1000).trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const requests = await getAllVerificationRequests();
        const req = requests.find((r) => r.id === input.requestId);
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
        limit: z.number().int().max(200).optional().default(100),
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
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    listAllJobs: adminProcedure
      .input(jobFilterSchema)
      .query(async ({ input }) => {
        return listJobs(input);
      }),
    deleteJob: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteJob(input.id);
        return { success: true };
      }),
    listEscrow: adminProcedure.query(async () => {
      return getAllEscrowPayments();
    }),
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
      .input(z.object({ activeOnly: z.boolean().optional().default(true) }))
      .query(async ({ input }) => listProducts(input.activeOnly)),
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
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByReference(input.reference);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        if (order.userId !== ctx.user.id && !isPlatformAdmin(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (order.status === "paid") return { success: true, status: "paid" as const };
        const result = await verifyPaystackTransaction(input.reference);
        if (result.status === "success") {
          await updateOrder(order.id!, { status: "paid", paidAt: new Date() });
          return { success: true, status: "paid" as const };
        }
        await updateOrder(order.id!, { status: "failed" });
        return { success: false, status: "failed" as const };
      }),
    myOrders: protectedProcedure.query(async ({ ctx }) => getOrdersByUserId(ctx.user.id)),
    all: adminProcedure.query(async () => getAllOrders()),
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
        console.log("[EmailAuth] OTP email dispatched via Supabase Auth");
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
  }),

  phoneAuth: router({
    sendOtp: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format."),
      }))
      .mutation(async ({ input }) => {
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Phone sign-in is not enabled yet. Please use email or Google sign-in.",
          });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await createPhoneOtp(input.phone, otp, expiresAt);
        return { success: true, message: "Phone OTP delivery is available only when an approved provider is configured." };
      }),
    verifyOtp: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format."),
        otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits."),
        name: z.string().min(2).max(100).trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await getLatestPhoneOtp(input.phone);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "No OTP found. Request a new one." });
        if (record.attempts >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Request a new OTP." });
        if (new Date() > record.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired. Request a new one." });
        await incrementOtpAttempts(record.id);
        if (record.otp !== input.otp) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid OTP. Please try again." });
        await markOtpVerified(record.id);
        const user = await upsertUserByPhone(input.phone, input.name);
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const { COOKIE_NAME: CNAME } = await import("../shared/const");
        const cookieOpts = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(CNAME, token, { ...cookieOpts, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
      }),
  }),
});

export type AppRouter = typeof appRouter;
