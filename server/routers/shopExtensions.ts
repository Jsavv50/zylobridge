import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  commerceAccessGrants,
  commerceProcurementItems,
  commerceProcurementQuotes,
  commerceProcurementRequests,
  commerceRequests,
  commerceSavedProducts,
  commerceSellerApplications,
  organizationMembers,
} from "../../drizzle/schema";
import { getDb, createAuditLog } from "../db";
import { getProductByHandle } from "../_core/shopify";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { createInAppNotification } from "../phase4";

const productReferenceSchema = z.object({
  shopifyProductId: z.string().min(8).max(255),
  productHandle: z.string().min(1).max(255),
});

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Commerce data is temporarily unavailable." });
  return db;
}

async function requireValidProduct(input: z.infer<typeof productReferenceSchema>) {
  const product = await getProductByHandle(input.productHandle);
  if (!product || product.id !== input.shopifyProductId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
  }
  return product;
}

async function requireOrganizationMember(userId: number, organizationId: number) {
  const db = await dbOrThrow();
  const [membership] = await db
    .select({ id: organizationMembers.id, role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.status, "active"),
    ))
    .limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Organization access is required." });
  return membership;
}

async function approvedSeller(userId: number) {
  const db = await dbOrThrow();
  const [seller] = await db
    .select()
    .from(commerceSellerApplications)
    .where(and(eq(commerceSellerApplications.userId, userId), eq(commerceSellerApplications.status, "approved")))
    .limit(1);
  return seller ?? null;
}

export const shopExtensionsRouter = router({
  saved: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      return db.select().from(commerceSavedProducts)
        .where(eq(commerceSavedProducts.userId, ctx.user.id))
        .orderBy(desc(commerceSavedProducts.createdAt));
    }),
    toggle: protectedProcedure
      .input(productReferenceSchema.extend({ saved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await requireValidProduct(input);
        const db = await dbOrThrow();
        if (input.saved) {
          await db.insert(commerceSavedProducts).values({
            userId: ctx.user.id,
            shopifyProductId: input.shopifyProductId,
            productHandle: input.productHandle,
          }).onConflictDoNothing();
        } else {
          await db.delete(commerceSavedProducts).where(and(
            eq(commerceSavedProducts.userId, ctx.user.id),
            eq(commerceSavedProducts.shopifyProductId, input.shopifyProductId),
          ));
        }
        return { saved: input.saved };
      }),
  }),

  requests: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      return db.select().from(commerceRequests)
        .where(eq(commerceRequests.requesterId, ctx.user.id))
        .orderBy(desc(commerceRequests.createdAt));
    }),
    create: protectedProcedure
      .input(productReferenceSchema.extend({
        requestType: z.enum(["rental", "service", "training", "digital"]),
        quantity: z.number().int().min(1).max(100).default(1),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        serviceLocation: z.string().trim().max(255).optional(),
        message: z.string().trim().min(10).max(3000),
      }))
      .mutation(async ({ ctx, input }) => {
        const product = await requireValidProduct(input);
        const startAt = input.startAt ? new Date(input.startAt) : null;
        const endAt = input.endAt ? new Date(input.endAt) : null;
        if (startAt && endAt && endAt <= startAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after the start date." });
        }
        if (input.requestType === "rental" && (!startAt || !endAt || !input.serviceLocation)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Rental dates and site location are required." });
        }
        const db = await dbOrThrow();
        const [request] = await db.insert(commerceRequests).values({
          requesterId: ctx.user.id,
          shopifyProductId: input.shopifyProductId,
          productHandle: input.productHandle,
          requestType: input.requestType,
          quantity: input.quantity,
          startAt,
          endAt,
          serviceLocation: input.serviceLocation ?? null,
          message: input.message,
          status: "submitted",
        }).returning();
        await createAuditLog({
          actorUserId: ctx.user.id,
          actorRole: ctx.user.role,
          action: `commerce.${input.requestType}.submitted`,
          resourceType: "commerce_request",
          resourceId: String(request.id),
          newState: JSON.stringify({ productId: product.id, handle: product.handle, type: input.requestType }),
          metadata: null,
        });
        return request;
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [request] = await db.select().from(commerceRequests)
          .where(and(eq(commerceRequests.id, input.id), eq(commerceRequests.requesterId, ctx.user.id)))
          .limit(1);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
        if (!["submitted", "reviewing"].includes(request.status)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This request can no longer be cancelled." });
        }
        const [updated] = await db.update(commerceRequests).set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(commerceRequests.id, request.id)).returning();
        return updated;
      }),
    listAll: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return db.select().from(commerceRequests).orderBy(desc(commerceRequests.createdAt));
    }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["reviewing", "approved", "declined", "completed"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [existing] = await db.select().from(commerceRequests).where(eq(commerceRequests.id, input.id)).limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Commerce request not found." });
        const [updated] = await db.update(commerceRequests).set({ status: input.status, updatedAt: new Date() }).where(eq(commerceRequests.id, input.id)).returning();
        await createInAppNotification({ userId: existing.requesterId, title: "Shop request updated", content: `Your ${existing.requestType} request is now ${input.status}.`, category: "system", referenceType: "commerce_request", referenceId: String(existing.id) });
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "commerce.request_status_updated", resourceType: "commerce_request", resourceId: String(existing.id), previousState: JSON.stringify({ status: existing.status }), newState: JSON.stringify({ status: input.status }), metadata: null });
        return updated;
      }),
  }),

  seller: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const [application] = await db.select().from(commerceSellerApplications)
        .where(eq(commerceSellerApplications.userId, ctx.user.id)).limit(1);
      return application ?? null;
    }),
    submitApplication: protectedProcedure
      .input(z.object({
        organizationId: z.number().int().positive().optional(),
        businessName: z.string().trim().min(2).max(255),
        sellerType: z.enum(["supplier", "rental_provider", "trainer", "service_provider", "digital_publisher"]),
        country: z.enum(["NG", "ZA"]),
        description: z.string().trim().min(40).max(3000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.organizationId) await requireOrganizationMember(ctx.user.id, input.organizationId);
        const db = await dbOrThrow();
        const [existing] = await db.select().from(commerceSellerApplications)
          .where(eq(commerceSellerApplications.userId, ctx.user.id)).limit(1);
        if (existing && ["pending", "under_review", "approved"].includes(existing.status)) {
          throw new TRPCError({ code: "CONFLICT", message: "A seller application is already active for this account." });
        }
        const values = {
          userId: ctx.user.id,
          organizationId: input.organizationId ?? null,
          businessName: input.businessName,
          sellerType: input.sellerType,
          country: input.country,
          description: input.description,
          status: "pending" as const,
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: new Date(),
        };
        const [application] = existing
          ? await db.update(commerceSellerApplications).set(values).where(eq(commerceSellerApplications.id, existing.id)).returning()
          : await db.insert(commerceSellerApplications).values(values).returning();
        await createAuditLog({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "commerce.seller_applied", resourceType: "commerce_seller_application", resourceId: String(application.id), newState: JSON.stringify({ sellerType: input.sellerType, country: input.country }), metadata: null });
        return application;
      }),
    review: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["under_review", "approved", "rejected", "suspended"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [existing] = await db.select().from(commerceSellerApplications).where(eq(commerceSellerApplications.id, input.id)).limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Seller application not found." });
        const [updated] = await db.update(commerceSellerApplications).set({ status: input.status, reviewedBy: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(commerceSellerApplications.id, input.id)).returning();
        await createInAppNotification({ userId: existing.userId, title: "Seller application updated", content: `Your Shop seller application is now ${input.status.replaceAll("_", " ")}.`, category: "system", referenceType: "commerce_seller_application", referenceId: String(input.id) });
        return updated;
      }),
    listApplications: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return db.select().from(commerceSellerApplications).orderBy(desc(commerceSellerApplications.createdAt));
    }),
  }),

  procurement: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      return db.select().from(commerceProcurementRequests)
        .where(eq(commerceProcurementRequests.buyerId, ctx.user.id))
        .orderBy(desc(commerceProcurementRequests.createdAt));
    }),
    listOpen: protectedProcedure.query(async ({ ctx }) => {
      if (!(await approvedSeller(ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Approved seller access is required." });
      const db = await dbOrThrow();
      return db.select({
        id: commerceProcurementRequests.id,
        title: commerceProcurementRequests.title,
        description: commerceProcurementRequests.description,
        deliveryLocation: commerceProcurementRequests.deliveryLocation,
        neededBy: commerceProcurementRequests.neededBy,
        currency: commerceProcurementRequests.currency,
        status: commerceProcurementRequests.status,
        createdAt: commerceProcurementRequests.createdAt,
      }).from(commerceProcurementRequests)
        .where(inArray(commerceProcurementRequests.status, ["open", "reviewing"]))
        .orderBy(desc(commerceProcurementRequests.createdAt));
    }),
    detail: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [request] = await db.select().from(commerceProcurementRequests).where(eq(commerceProcurementRequests.id, input.id)).limit(1);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Procurement request not found." });
        const isBuyer = request.buyerId === ctx.user.id;
        const seller = isBuyer ? null : await approvedSeller(ctx.user.id);
        if (!isBuyer && !seller && ctx.user.role !== "admin" && ctx.user.role !== "SUPER_ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
        const items = await db.select().from(commerceProcurementItems).where(eq(commerceProcurementItems.requestId, request.id));
        const quotes = isBuyer || ctx.user.role === "admin" || ctx.user.role === "SUPER_ADMIN"
          ? await db.select().from(commerceProcurementQuotes).where(eq(commerceProcurementQuotes.requestId, request.id)).orderBy(desc(commerceProcurementQuotes.createdAt))
          : await db.select().from(commerceProcurementQuotes).where(and(eq(commerceProcurementQuotes.requestId, request.id), eq(commerceProcurementQuotes.sellerUserId, ctx.user.id))).orderBy(desc(commerceProcurementQuotes.createdAt));
        return { request, items, quotes };
      }),
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number().int().positive().optional(),
        title: z.string().trim().min(4).max(255),
        description: z.string().trim().min(20).max(5000),
        deliveryLocation: z.string().trim().min(2).max(255),
        neededBy: z.string().datetime().optional(),
        currency: z.enum(["NGN", "ZAR"]).default("ZAR"),
        items: z.array(z.object({
          shopifyProductId: z.string().max(255).optional(),
          productHandle: z.string().max(255).optional(),
          title: z.string().trim().min(2).max(255),
          specifications: z.string().trim().max(3000).optional(),
          quantity: z.number().int().min(1).max(100000),
        })).min(1).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.organizationId) await requireOrganizationMember(ctx.user.id, input.organizationId);
        const db = await dbOrThrow();
        return db.transaction(async (tx) => {
          const [request] = await tx.insert(commerceProcurementRequests).values({
            buyerId: ctx.user.id,
            organizationId: input.organizationId ?? null,
            title: input.title,
            description: input.description,
            deliveryLocation: input.deliveryLocation,
            neededBy: input.neededBy ? new Date(input.neededBy) : null,
            currency: input.currency,
            status: "open",
          }).returning();
          const items = await tx.insert(commerceProcurementItems).values(input.items.map((item) => ({ ...item, shopifyProductId: item.shopifyProductId ?? null, productHandle: item.productHandle ?? null, specifications: item.specifications ?? null, requestId: request.id }))).returning();
          return { request, items };
        });
      }),
    submitQuote: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), amountMinor: z.number().int().positive(), currency: z.enum(["NGN", "ZAR"]), fulfillmentDays: z.number().int().min(1).max(365), message: z.string().trim().max(3000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!(await approvedSeller(ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Approved seller access is required." });
        const db = await dbOrThrow();
        const [request] = await db.select().from(commerceProcurementRequests).where(eq(commerceProcurementRequests.id, input.requestId)).limit(1);
        if (!request || !["open", "reviewing"].includes(request.status)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This request is not accepting quotes." });
        if (request.buyerId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot quote on your own request." });
        if (input.currency !== request.currency) throw new TRPCError({ code: "BAD_REQUEST", message: `Quote currency must be ${request.currency}.` });
        const [quote] = await db.insert(commerceProcurementQuotes).values({ requestId: request.id, sellerUserId: ctx.user.id, amountMinor: input.amountMinor, currency: input.currency, fulfillmentDays: input.fulfillmentDays, message: input.message ?? null, status: "submitted" }).onConflictDoUpdate({ target: [commerceProcurementQuotes.requestId, commerceProcurementQuotes.sellerUserId], set: { amountMinor: input.amountMinor, currency: input.currency, fulfillmentDays: input.fulfillmentDays, message: input.message ?? null, status: "submitted", updatedAt: new Date() } }).returning();
        await createInAppNotification({ userId: request.buyerId, title: "New procurement quote", content: `A verified Shop seller responded to ${request.title}.`, category: "system", referenceType: "commerce_procurement_request", referenceId: String(request.id) });
        return quote;
      }),
    acceptQuote: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), quoteId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [request] = await db.select().from(commerceProcurementRequests).where(eq(commerceProcurementRequests.id, input.requestId)).limit(1);
        if (!request || request.buyerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the request owner can accept a quote." });
        if (!["open", "reviewing"].includes(request.status)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This request is not accepting quote decisions." });
        const [quote] = await db.select().from(commerceProcurementQuotes).where(and(eq(commerceProcurementQuotes.id, input.quoteId), eq(commerceProcurementQuotes.requestId, request.id))).limit(1);
        if (!quote || quote.status !== "submitted") throw new TRPCError({ code: "NOT_FOUND", message: "Active quote not found." });
        await db.transaction(async (tx) => {
          await tx.update(commerceProcurementQuotes).set({ status: "rejected", updatedAt: new Date() }).where(and(eq(commerceProcurementQuotes.requestId, request.id), eq(commerceProcurementQuotes.status, "submitted")));
          await tx.update(commerceProcurementQuotes).set({ status: "accepted", updatedAt: new Date() }).where(eq(commerceProcurementQuotes.id, quote.id));
          await tx.update(commerceProcurementRequests).set({ status: "awarded", updatedAt: new Date() }).where(eq(commerceProcurementRequests.id, request.id));
        });
        await createInAppNotification({ userId: quote.sellerUserId, title: "Procurement quote accepted", content: `Your quote for ${request.title} was accepted. Coordinate the next steps through ZYLOBRIDGE messaging.`, category: "system", referenceType: "commerce_procurement_request", referenceId: String(request.id) });
        return { success: true };
      }),
  }),

  access: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      return db.select().from(commerceAccessGrants)
        .where(eq(commerceAccessGrants.userId, ctx.user.id))
        .orderBy(desc(commerceAccessGrants.createdAt));
    }),
  }),
});

export type ShopExtensionsRouter = typeof shopExtensionsRouter;
