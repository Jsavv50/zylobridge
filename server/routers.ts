import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  upsertUser,
  getUserByOpenId,
  getUserById,
  updateUserType,
  updateUserRole,
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
  updateApplicationStatus,
  getApplicationCount,
  createProfile,
  getProfileByUserId,
  updateProfile,
  createReview,
  getReviewsByRevieweeId,
  getAdminStats,
} from "./db";

// ── Admin guard ────────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

// ── Input schemas ──────────────────────────────────────────────────────────────
const jobFilterSchema = z.object({
  vocation: z.string().max(64).optional(),
  location: z.string().max(128).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  minBudget: z.number().nonnegative().optional(),
  maxBudget: z.number().nonnegative().optional(),
  limit: z.number().int().min(1).max(200).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

const jobCreateSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  vocation: z.string().max(64),
  budget: z.number().positive(),
  location: z.string().min(2).max(200).trim(),
  deadline: z.string().optional(),
  isUrgent: z.boolean().optional().default(false),
});

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
      .input(z.object({ userType: z.enum(["client", "professional"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserType(ctx.user.id, input.userType);
        return { success: true };
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
      if (ctx.user.userType !== "client" && ctx.user.role !== "admin") {
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
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "completed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.clientId !== ctx.user.id && ctx.user.role !== "admin") {
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
        if (job.clientId !== ctx.user.id && ctx.user.role !== "admin") {
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
        if (job.clientId !== ctx.user.id && ctx.user.role !== "admin") {
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
          if (job.clientId !== ctx.user.id && ctx.user.role !== "admin") {
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
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
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
  }),
});

export type AppRouter = typeof appRouter;
