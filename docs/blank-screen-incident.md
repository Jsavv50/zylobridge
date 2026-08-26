# Vercel Blank-Screen Investigation

**Status:** Active investigation as of 2026-08-26.

The current Vercel production deployment is marked **Ready** for Git commit `4641d28` (`Document enterprise reconciliation release handoff`). The Railway health endpoint remains reachable and returns the expected health JSON.

On `https://zylobridge.com`, the deployment serves the application HTML and all referenced JavaScript and CSS assets load, but the DOM element with ID `root` remains empty. The browser page therefore appears as a blank black screen. The local development preview renders the `/sign-in` route successfully after correcting development-only root-route ordering, so the failure is limited to the production client build or its production runtime configuration.

The exact Vercel preview deployment is access-protected and cannot be used for unauthenticated runtime inspection. The production Vercel configuration has a `VITE_API_URL` variable for Production and Preview. Vercel deployment runtime logs show no application errors because this is a static frontend deployment.

The root cause was confirmed by serving the compiled `dist/public` build directly: the client rendered correctly in development but produced an empty `#root` in the production build when the custom Rollup `manualChunks` function was enabled. The same static build rendered the sign-in route immediately after the custom chunk partitioning was removed. This indicates a production chunk-initialization/ordering failure rather than a Vercel domain, Railway availability, or API-environment issue.

The repair removes the custom `manualChunks` configuration and retains Vite's default dependency graph. The Home and NotFound modules are also route-lazy, and the entrypoint has a root-level recovery boundary so future asynchronous application-module failures produce a usable recovery state instead of an empty page.

Validation completed locally against both the development server and a static production preview: `/sign-in` renders successfully. The client bundle carries a Vite size warning (the entry chunk is just over 500 KB) but is functional; performance optimization must be reintroduced only with a tested chunk graph.

## Public Verification

Vercel deployed the root-cause repair as production commit `c429a840`. The public `https://zylobridge.com/sign-in` route was then verified in a clean browser session. It initially displayed the intentional lazy-loading state and then rendered the complete sign-in interface, including the Google, email OTP, and phone OTP options. The empty-root black screen is resolved.
