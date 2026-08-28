/**
 * Commerce router — backend-agnostic tRPC surface for the storefront.
 *
 * The router is intentionally thin: zod validates input, then delegates to the
 * named functions exported from `server/_core/shopify`. If we ever swap
 * commerce backends, only `_core/shopify.ts` + `_core/shopifyNormalize.ts`
 * change — this router stays put.
 */

import { z } from "zod";
import {
  addCartLines,
  createCart,
  getCart,
  getCollectionByHandle,
  getProductByHandle,
  listCollections,
  listProducts,
  removeCartLines,
  updateCartLines,
} from "../_core/shopify";
import { publicProcedure, router } from "../_core/trpc";

const cartLineInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const cartLineUpdateSchema = z.object({
  lineId: z.string().min(1),
  /** 0 means "remove this line" — the route forwards to removeLines. */
  quantity: z.number().int().min(0).max(99),
});

const catalogSearchSchema = z.object({
  q: z.string().trim().max(160).optional(),
  department: z.string().trim().max(80).optional(),
  modality: z.enum(["all", "physical-goods", "rental", "training", "service", "digital"]).default("all"),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  availableOnly: z.boolean().default(false),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "title"]).default("relevance"),
  limit: z.number().int().min(1).max(48).default(24),
  offset: z.number().int().nonnegative().default(0),
});

function productTagValue(tags: string[], key: string) {
  return tags.find((tag) => tag.startsWith(`${key}:`))?.slice(key.length + 1) ?? null;
}

export const commerceRouter = router({
  products: router({
    list: publicProcedure
      .input(
        z
          .object({
            first: z.number().int().min(1).max(100).optional(),
            collectionHandle: z.string().min(1).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listProducts(input ?? {});
      }),
    byHandle: publicProcedure
      .input(z.object({ handle: z.string().min(1) }))
      .query(async ({ input }) => {
        return getProductByHandle(input.handle);
      }),
    search: publicProcedure
      .input(catalogSearchSchema)
      .query(async ({ input }) => {
        const products = await listProducts({ first: 100 });
        const query = input.q?.toLocaleLowerCase() ?? "";
        const filtered = products.filter((product) => {
          const searchable = [product.title, product.description, product.productType ?? "", product.vendor ?? "", ...product.tags].join(" ").toLocaleLowerCase();
          const department = productTagValue(product.tags, "department");
          const modality = productTagValue(product.tags, "modality") ?? "physical-goods";
          const minPrice = Number(product.priceRange.min.amount);
          const available = product.variants.some((variant) => variant.availableForSale);
          if (query && !searchable.includes(query)) return false;
          if (input.department && department !== input.department) return false;
          if (input.modality !== "all" && modality !== input.modality) return false;
          if (input.minPrice != null && minPrice < input.minPrice) return false;
          if (input.maxPrice != null && minPrice > input.maxPrice) return false;
          if (input.availableOnly && !available) return false;
          return true;
        });
        filtered.sort((a, b) => {
          if (input.sort === "price_asc") return Number(a.priceRange.min.amount) - Number(b.priceRange.min.amount);
          if (input.sort === "price_desc") return Number(b.priceRange.min.amount) - Number(a.priceRange.min.amount);
          if (input.sort === "title") return a.title.localeCompare(b.title);
          return a.title.localeCompare(b.title);
        });
        const counts = products.reduce((result, product) => {
          const department = productTagValue(product.tags, "department") ?? "other";
          const modality = productTagValue(product.tags, "modality") ?? "physical-goods";
          result.departments[department] = (result.departments[department] ?? 0) + 1;
          result.modalities[modality] = (result.modalities[modality] ?? 0) + 1;
          return result;
        }, { departments: {} as Record<string, number>, modalities: {} as Record<string, number> });
        return {
          items: filtered.slice(input.offset, input.offset + input.limit),
          total: filtered.length,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < filtered.length,
          counts,
          currency: products[0]?.priceRange.min.currencyCode ?? null,
        };
      }),
  }),
  collections: router({
    list: publicProcedure
      .input(z.object({ first: z.number().int().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return listCollections(input?.first);
      }),
    byHandle: publicProcedure
      .input(z.object({ handle: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCollectionByHandle(input.handle);
      }),
  }),
  cart: router({
    create: publicProcedure
      .input(z.object({ lines: z.array(cartLineInputSchema).min(1).max(50) }))
      .mutation(async ({ input }) => {
        return createCart(input.lines);
      }),
    get: publicProcedure
      .input(z.object({ cartId: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCart(input.cartId);
      }),
    addLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lines: z.array(cartLineInputSchema).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        return addCartLines(input.cartId, input.lines);
      }),
    updateLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lines: z.array(cartLineUpdateSchema).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        // qty 0 means "remove this line" — split the request so the client
        // never has to call two procedures for a single user gesture.
        const toRemove = input.lines.filter(l => l.quantity === 0).map(l => l.lineId);
        const toUpdate = input.lines.filter(l => l.quantity > 0);

        let cart = null;
        if (toUpdate.length) {
          cart = await updateCartLines(input.cartId, toUpdate);
        }
        if (toRemove.length) {
          cart = await removeCartLines(input.cartId, toRemove);
        }
        if (!cart) cart = await getCart(input.cartId);
        return cart;
      }),
    removeLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lineIds: z.array(z.string().min(1)).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        return removeCartLines(input.cartId, input.lineIds);
      }),
  }),
});

export type CommerceRouter = typeof commerceRouter;
