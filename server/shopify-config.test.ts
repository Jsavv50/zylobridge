import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SHOPIFY_API_VERSION,
  getShopifyApiVersion,
} from "./_core/shopify";

const originalVersion = process.env.SHOPIFY_STOREFRONT_API_VERSION;

afterEach(() => {
  if (originalVersion === undefined) {
    delete process.env.SHOPIFY_STOREFRONT_API_VERSION;
  } else {
    process.env.SHOPIFY_STOREFRONT_API_VERSION = originalVersion;
  }
});

describe("Shopify production configuration", () => {
  it("accepts a supported quarterly Storefront API version", () => {
    process.env.SHOPIFY_STOREFRONT_API_VERSION = "2026-07";
    expect(getShopifyApiVersion()).toBe("2026-07");
  });

  it("falls back safely when the runtime version is absent or malformed", () => {
    process.env.SHOPIFY_STOREFRONT_API_VERSION = "latest";
    expect(getShopifyApiVersion()).toBe(DEFAULT_SHOPIFY_API_VERSION);

    delete process.env.SHOPIFY_STOREFRONT_API_VERSION;
    expect(getShopifyApiVersion()).toBe(DEFAULT_SHOPIFY_API_VERSION);
  });
});
