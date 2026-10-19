import { describe, expect, it } from "vitest";
import type { Product } from "../shared/commerce/types";
import { getCommerceMode, isRetailProduct } from "../shared/commerce/classification";

function product(tags: string[], amount = "1250.00"): Product {
  return {
    id: "gid://shopify/Product/1",
    handle: "industrial-listing",
    title: "Industrial listing",
    description: "",
    descriptionHtml: "",
    productType: "Industrial Machinery",
    vendor: "ZYLOBRIDGE supplier",
    tags,
    images: [],
    priceRange: { min: { amount, currencyCode: "ZAR" }, max: { amount, currencyCode: "ZAR" } },
    options: [],
    variants: [{
      id: "gid://shopify/ProductVariant/1",
      title: "Default",
      price: { amount, currencyCode: "ZAR" },
      compareAtPrice: null,
      availableForSale: true,
      selectedOptions: [],
    }],
  };
}

describe("commerce mode classification", () => {
  it("honors case-insensitive explicit commerce tags", () => {
    expect(getCommerceMode(product(["Commerce:BUY"]))).toBe("buy");
    expect(getCommerceMode(product([" commerce:quote "]))).toBe("quote");
    expect(getCommerceMode(product(["COMMERCE:RENTAL"]))).toBe("rental");
  });

  it("never treats zero or invalid prices as retail buy", () => {
    expect(getCommerceMode(product(["commerce:buy"], "0.00"))).toBe("quote");
    expect(getCommerceMode(product(["commerce:buy"], "not-a-price"))).toBe("quote");
    expect(isRetailProduct(product(["commerce:buy"], "0.00"))).toBe(false);
  });

  it("keeps legacy rental modality compatible while positive legacy products remain buyable", () => {
    expect(getCommerceMode(product(["modality:rental"]))).toBe("rental");
    expect(getCommerceMode(product(["modality:physical-goods"]))).toBe("buy");
  });
});
