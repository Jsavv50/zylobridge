import type { Product } from "./types";

export const COMMERCE_MODES = ["buy", "quote", "rental"] as const;
export type CommerceMode = (typeof COMMERCE_MODES)[number];

export const COMMERCE_MODE_LABELS: Record<CommerceMode, string> = {
  buy: "Buy",
  quote: "Request Quote",
  rental: "Request Rental",
};

export const COMMERCE_MODE_DESCRIPTIONS: Record<CommerceMode, string> = {
  buy: "Verified Shopify pricing and secure hosted checkout.",
  quote: "Scope, logistics, and availability are reviewed before pricing.",
  rental: "Hire dates, site requirements, and availability are reviewed before confirmation.",
};

function tagValue(tags: string[], prefix: string) {
  const normalizedPrefix = `${prefix.toLowerCase()}:`;
  const tag = tags.find((value) => value.trim().toLowerCase().startsWith(normalizedPrefix));
  return tag ? tag.trim().slice(normalizedPrefix.length).trim().toLowerCase() : null;
}

function hasPositivePrice(product: Product) {
  const amounts = product.variants.map((variant) => Number(variant.price.amount));
  return amounts.length > 0 && amounts.some((amount) => Number.isFinite(amount) && amount > 0);
}

/**
 * Shopify metadata is authoritative for the commerce pathway. Legacy modality
 * tags remain a compatibility fallback for existing catalog records.
 * A listing without a verifiable positive price can never enter retail buy.
 */
export function getCommerceMode(product: Product): CommerceMode {
  const explicit = tagValue(product.tags, "commerce");
  if (explicit === "rental") return "rental";
  if (explicit === "quote") return "quote";
  if (explicit === "buy" && hasPositivePrice(product)) return "buy";
  if (explicit === "buy") return "quote";

  const legacyModality = tagValue(product.tags, "modality");
  if (legacyModality === "rental") return "rental";
  if (!hasPositivePrice(product)) return "quote";
  return "buy";
}

export function isRetailProduct(product: Product) {
  return getCommerceMode(product) === "buy";
}

export function getCommerceModeLabel(product: Product) {
  return COMMERCE_MODE_LABELS[getCommerceMode(product)];
}
