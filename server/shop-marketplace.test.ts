import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

const app = read("client/src/App.tsx");
const shop = read("client/src/pages/Shop.tsx");
const detail = read("client/src/pages/ShopProductDetail.tsx");
const workspace = read("client/src/pages/ShopWorkspace.tsx");
const seller = read("client/src/pages/ShopSellerCenter.tsx");
const admin = read("client/src/pages/ShopAdmin.tsx");
const cart = read("client/src/contexts/CartContext.tsx");
const cartPage = read("client/src/pages/ShopCartPage.tsx");
const schema = read("drizzle/schema.ts");
const migration = read("drizzle/0019_shopify_commerce_extensions.sql");
const router = read("server/routers/shopExtensions.ts");
const commerceRouter = read("server/routers/commerce.ts");
const catalog = read("client/src/lib/shopCatalog.ts");

describe("ZYLOBRIDGE Shop and Trade Marketplace", () => {
  it("mounts the injected Shopify commerce router and persistent CartProvider", () => {
    expect(read("server/routers.ts")).toContain("commerce: commerceRouter");
    expect(app).toContain("<CartProvider>");
    expect(cart).toContain("commerce:cart-id");
  });

  it("registers the requested public and authenticated commerce routes lazily", () => {
    for (const route of ["/shop/product/:handle", "/shop/products/:slug", "/shop/department/:slug", "/shop/compare", "/shop/cart", "/shop/checkout", "/shop/account", "/shop/wishlist", "/shop/requests", "/shop/procurement", "/shop/digital", "/shop/orders", "/shop/seller", "/shop/admin"]) {
      expect(app).toContain(`path=\"${route}\"`);
    }
    expect(app).toContain("lazy(() => import(\"./pages/ShopProductDetail\"))");
    expect(app).toContain("/shop/downloads");
    expect(app).toContain("/shop/quotes");
    expect(app).toContain("/shop/transactions");
  });

  it("provides all twelve required departments and five transaction modes", () => {
    expect(catalog.match(/slug: /g)?.length).toBe(12);
    for (const department of ["tools-equipment", "construction-materials", "safety-ppe", "electrical", "plumbing-water", "energy-power", "vehicle-parts", "agriculture", "industrial-machinery", "training-certification", "digital-resources", "services"]) expect(catalog).toContain(department);
    for (const modality of ["physical-goods", "rental", "training", "service", "digital"]) expect(shop + detail).toContain(modality);
  });

  it("uses the Shopify Storefront API as catalog, cart, checkout, price, inventory, order, and fulfillment authority", () => {
    expect(shop).toContain("Shopify-backed checkout");
    expect(cart).toContain("proceedToCheckout");
    expect(cartPage).toContain("Shipping, tax, payment method, final total, order creation, and confirmation are completed by Shopify");
    expect(detail).toContain("Price, availability, cart, checkout, payment confirmation, order creation, tax, and fulfillment are authoritative in Shopify");
    expect(commerceRouter).toContain("products: router");
    expect(commerceRouter).toContain("cart: router");
    expect(shop).toContain("finalized by the connected Shopify store in hosted checkout");
    expect(shop).not.toContain("connected development store currently uses ZAR");
  });

  it("keeps only ZYLOBRIDGE-specific extension data in PostgreSQL", () => {
    for (const table of ["commerce_saved_products", "commerce_requests", "commerce_seller_applications", "commerce_procurement_requests", "commerce_procurement_items", "commerce_procurement_quotes", "commerce_access_grants"]) {
      expect(schema).toContain(table);
      expect(migration).toContain(table);
    }
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS commerce_products|CREATE TABLE IF NOT EXISTS commerce_orders|CREATE TABLE IF NOT EXISTS commerce_carts/);
  });

  it("enforces authentication, ownership, organization membership, seller approval, and administrator moderation", () => {
    expect(router).toContain("protectedProcedure");
    expect(router).toContain("adminProcedure");
    expect(router).toContain("requireOrganizationMember");
    expect(router).toContain("Approved seller access is required");
    expect(router).toContain("Only the request owner can accept a quote");
    expect(admin).toContain("Administrator access required");
  });

  it("validates product references server-side and keeps checkout amounts out of client mutations", () => {
    expect(router).toContain("requireValidProduct");
    expect(router).toContain("getProductByHandle");
    expect(cart).toContain("variantId");
    expect(cart).not.toContain("amountMinor");
    expect(detail).not.toContain("Paystack");
  });

  it("supports saved products, multimodal requests, RFQs, seller quotes, controlled access, notifications, and audit logs", () => {
    for (const capability of ["saved: router", "requests: router", "seller: router", "procurement: router", "access: router", "createInAppNotification", "createAuditLog", "onConflictDoUpdate"]) expect(router).toContain(capability);
    expect(workspace).toContain("Access appears only after an authorized server-side grant");
    expect(seller).toContain("Only approved sellers can see this bounded marketplace queue");
  });

  it("blocks restricted goods and avoids fabricated customer content or unsupported claims", () => {
    expect(catalog).toContain("RESTRICTED_PRODUCT_TERMS");
    expect(shop).toContain("No fabricated reviews or supplier ratings");
    expect(detail).toContain("No fabricated reviews or certifications");
    for (const source of [shop, detail, seller]) {
      expect(source).not.toMatch(/★★★★★|4\.9\/5|1,000\+ reviews|trusted by \d/i);
    }
  });

  it("provides responsive and accessible interaction foundations", () => {
    expect(shop).toContain("aria-label=\"Search Shop\"");
    expect(detail).toContain("aria-label=\"Save product\"");
    expect(cartPage).toContain("aria-label=\"Decrease quantity\"");
    expect(shop).toContain("sm:grid-cols-2");
    expect(shop).toContain("xl:grid-cols-4");
    expect(shop).toContain("document.title = \"Shop Tools, Equipment, Services & Trade Resources | ZYLOBRIDGE\"");
  });
});
