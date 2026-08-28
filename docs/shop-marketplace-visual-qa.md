# Shop and Trade Marketplace Visual QA

## Local preview verification

The public `/shop` route settled successfully after client data loading. It rendered the complete trade marketplace hierarchy, all twelve departments, five supported transaction modes, two live Shopify products, their generated product images, ZAR prices, authoritative availability, global search, comparison, cart, buyer-protection language, and valid sourcing/seller CTAs.

The first full-page screenshot captured the catalog query before it settled, which explained the temporary zero counts and loading indicator. Direct tRPC smoke checks returned HTTP 200 for both `commerce.products.search` and `commerce.products.byHandle`, with two live handles and a valid product image. Interactive browser inspection then confirmed the final settled catalog UI.

The initial browser navigation to `/shop/product/portable-solar-site-lighting-kit` displayed the route-level loading indicator and required a follow-up settling check. No missing-route or immediate error state was shown.

The follow-up browser check confirmed that the product detail settled correctly with its Shopify CDN image, ZAR 3,899 price, authoritative availability, quantity input, save/compare controls, and transaction-system disclosure. Adding one unit created a Shopify cart successfully and opened the in-app cart drawer with the correct product, quantity, unit price, and ZAR 3,899 estimated total. Checkout was not opened and no order or payment was submitted.

Desktop cart QA rendered a clear, responsive empty-cart state with a valid return-to-Shop action. Mobile captures confirmed the public Shop hierarchy and cart containment; protected procurement and Seller Center routes retained the secure loading/authentication boundary. The capture runner again recorded product-detail and protected routes during their initial loading frames, while interactive browser inspection verified the settled product state and live cart behavior.

## Authoritative data validation

The additive Shop extension migration was verified against the authoritative Supabase PostgreSQL project. All seven extension tables are readable: saved products, multimodal requests, seller applications, procurement requests, procurement items, procurement quotes, and digital access grants. Each contained zero records at validation time, confirming that no fabricated workflow data, sellers, RFQs, quotes, grants, ratings, reviews, or transactions were seeded. The connected Shopify catalog independently returned two live products with images, ZAR prices, variants, and availability.
