# Vercel Blank-Screen Investigation

**Status:** Active investigation as of 2026-08-26.

The current Vercel production deployment is marked **Ready** for Git commit `4641d28` (`Document enterprise reconciliation release handoff`). The Railway health endpoint remains reachable and returns the expected health JSON.

On `https://zylobridge.com`, the deployment serves the application HTML and all referenced JavaScript and CSS assets load, but the DOM element with ID `root` remains empty. The browser page therefore appears as a blank black screen. The local development preview renders the `/sign-in` route successfully after correcting development-only root-route ordering, so the failure is limited to the production client build or its production runtime configuration.

The exact Vercel preview deployment is access-protected and cannot be used for unauthenticated runtime inspection. The production Vercel configuration has a `VITE_API_URL` variable for Production and Preview. Vercel deployment runtime logs show no application errors because this is a static frontend deployment.

Initial mitigation in progress: the eagerly loaded Home and NotFound modules were moved behind React lazy boundaries so an error in a page-specific module cannot prevent the application shell or sign-in page from mounting.
