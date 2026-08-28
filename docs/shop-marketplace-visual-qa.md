# Shop and Trade Marketplace Visual QA

## Local preview verification

The public `/shop` route settled successfully after client data loading. It rendered the complete trade marketplace hierarchy, all twelve departments, five supported transaction modes, two live Shopify products, their generated product images, ZAR prices, authoritative availability, global search, comparison, cart, buyer-protection language, and valid sourcing/seller CTAs.

The first full-page screenshot captured the catalog query before it settled, which explained the temporary zero counts and loading indicator. Direct tRPC smoke checks returned HTTP 200 for both `commerce.products.search` and `commerce.products.byHandle`, with two live handles and a valid product image. Interactive browser inspection then confirmed the final settled catalog UI.

The initial browser navigation to `/shop/product/portable-solar-site-lighting-kit` displayed the route-level loading indicator and required a follow-up settling check. No missing-route or immediate error state was shown.

The follow-up browser check confirmed that the product detail settled correctly with its Shopify CDN image, ZAR 3,899 price, authoritative availability, quantity input, save/compare controls, and transaction-system disclosure. Adding one unit created a Shopify cart successfully and opened the in-app cart drawer with the correct product, quantity, unit price, and ZAR 3,899 estimated total. Checkout was not opened and no order or payment was submitted.

Desktop cart QA rendered a clear, responsive empty-cart state with a valid return-to-Shop action. Mobile captures confirmed the public Shop hierarchy and cart containment; protected procurement and Seller Center routes retained the secure loading/authentication boundary. The capture runner again recorded product-detail and protected routes during their initial loading frames, while interactive browser inspection verified the settled product state and live cart behavior.

## Authoritative data validation

The additive Shop extension migration was verified against the authoritative Supabase PostgreSQL project. All seven extension tables are readable: saved products, multimodal requests, seller applications, procurement requests, procurement items, procurement quotes, and digital access grants. Each contained zero records at validation time, confirming that no fabricated workflow data, sellers, RFQs, quotes, grants, ratings, reviews, or transactions were seeded. The connected Shopify catalog independently returned two live products with images, ZAR prices, variants, and availability.

## Production deployment verification

The auto-published frontend reached `/shop` at `zylobridge.com`, loaded the new page title and authenticated navigation, and rendered the complete marketplace shell. The Railway API first returned the previous router, then updated to expose `commerce.products.search`. Its settled response was HTTP 500 with the safe message `Shopify Storefront API is not configured`, proving the remaining production blocker is missing `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_API_ACCESS_TOKEN` variables on the external Railway backend rather than a frontend, route, Shopify catalog, or application-code failure.

Before the sandbox reset, the authenticated Railway project showed the `zylobridge` service online at `api.zylobridge.com` and marked the new Shop GitHub deployment successful. After the reset, the browser cookie was cleared and the Variables URL returned Railway’s login/404 shell. The user has explicitly approved and supplied the Shopify domain, Storefront token, and API version, but the Railway update requires reauthentication before submission. No production variable was partially written.

The user subsequently added all three variables to Railway manually. The supplied Shopify domain resolves successfully and currently presents Shopify’s password-protected “Opening soon” storefront, confirming that the domain is active. A same-origin Storefront API probe was issued for the supplied quarterly API version; no credential value is recorded in this document.

The asynchronous browser-console runner did not retain the probe’s resolved response, and the sandbox shell simultaneously encountered TLS EOFs against both Railway and Shopify. Therefore, token compatibility remains to be established through the redeployed production tRPC procedure rather than inferred from an incomplete local probe.

After the user added the three variables manually, the independent production health endpoint returned `status: ok`, and `commerce.products.search` returned HTTP 200 through `api.zylobridge.com`. The response contained zero products, zero department/modality counts, and no currency. This verifies that the supplied store domain, Storefront token, and API version are accepted by the deployed backend, while also establishing that the user-specified Shopify storefront currently exposes no published Storefront products. ZYLOBRIDGE therefore renders its truthful empty-catalog state; it does not substitute the two products that remain in the separately provisioned development store.

After checkpoint `a19373b6`, the production `/shop` route loaded the updated title, complete marketplace shell, twelve departments, five modalities, buyer-protection disclosures, comparison route, and role-aware unauthenticated navigation. The catalog request was still in its loading frame during the first settled browser capture, while the independent no-cache production tRPC response remained HTTP 200 with an authoritative zero-product result. Further browser settling and route checks were continued without initiating checkout or payment.

The subsequent live browser state exposed the page’s safe retry UI with `The catalog is temporarily unavailable`, while an independent no-cache request to the identical public tRPC URL continued to return HTTP 200 with the authoritative empty catalog. A same-browser diagnostic fetch remained pending and produced no CORS or JavaScript console error, indicating a browser-network/TLS path discrepancy rather than a server response contract failure. No checkout or mutation was attempted.

Selecting `Try again` retained the safe retry state in the sandbox browser, while the same production procedure remained externally reachable and valid. The UI neither crashed nor substituted stale development-store products. This is treated as a browser-session network limitation rather than a catalog contract failure; production route verification continued using the deployed frontend and independently verified API response.

The production `/shop/cart` route rendered a complete, responsive empty-cart summary with zero items and a valid return-to-catalog action. It did not open hosted checkout, create an order, or initiate payment. The requested product-detail route for a handle that exists only in the separate development store entered its safe loading state against the user-specified empty production storefront; settling verification followed.

The product-detail route settled to the privacy-safe `Product unavailable` state with a valid return-to-Shop action, accurately reflecting that the handle is not published in the connected production storefront. The production procurement route resolved and entered its protected authentication-loading boundary; no RFQ or data mutation was created.

The procurement route then settled to `Sign in to your Shop workspace`, explicitly identifying saved products, requests, procurement, seller applications, and digital grants as private account data and preserving the encoded return path. The Seller Center route resolved and entered the same protected loading boundary; no seller application or quote was submitted.

The Seller Center route settled to `Sign in to Seller Center`, accurately protecting seller applications and procurement quotes behind authentication with the correct return path. The Shop administration route resolved and entered its authentication/authorization loading boundary; no moderation queue was exposed and no record was changed.

The Shop administration route then settled to `Administrator access required`, with moderation queues explicitly restricted and enforced server-side. The Shop account route resolved and entered its protected authentication-loading boundary; no saved product, request, grant, or order data was exposed.

The Shop account route settled to `Sign in to your Shop workspace`, preserving the encoded account return path and clearly identifying private commerce data. Production console inspection after the Shop homepage, cart, product, procurement, Seller Center, administration, and account checks returned no runtime exception, React hook warning, hydration failure, or unhandled authorization error. No checkout, order, payment, request, seller application, quote, or moderation mutation was performed.
