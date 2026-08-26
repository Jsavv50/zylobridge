# Phase 80 — Repeated Production Authentication Failure

A fresh Google initiation probe returned HTTP 302 with the configured Google client ID and the callback URL `https://api.zylobridge.com/api/auth/google/callback`. The signed-in Google account chooser displayed Witts655@gmail.com and the user-approved Continue action was selected. The browser then returned to `about:blank` with no visible callback result. This indicates the next diagnostic point is the callback/navigation handoff, not Google account selection.

Email OTP send behavior was separately probed against Railway for Witts655@gmail.com and returned HTTP 200 with a success payload; the production Vercel-origin CORS preflight also returned 204 with the expected credentialed headers. No OTP value was logged or stored in this document.

A fresh production Google acceptance attempt reached Google account selection for Witts655@gmail.com and the consent confirmation page, then returned to an empty browser observation. The Railway service dashboard currently reports the `zylobridge` API service as Online with the latest deployment successful. The public frontend then loaded the prior public Home surface, but did not show an authenticated session, so callback/session establishment remains unconfirmed.

## Repair applied

The fresh browser probe reproduced `TypeError: Failed to fetch` for a credentialed request from the Vercel origin even though direct IPv4 Railway requests and the CORS preflight succeeded. The production fix routes browser authentication and tRPC calls through Vercel’s same-origin `/api` proxy. `vercel.json` forwards `/api/(.*)` to `https://api.zylobridge.com/api/$1`; production `main.tsx` and `SignIn.tsx` now use the same-origin `/api` path, while non-production environments retain configurable `VITE_API_URL` support. Regression coverage was updated to enforce the proxy and credentials contract.

Validation after the repair passed: TypeScript check, the focused authentication regression suite, the full regression suite, the client build, and the server build. The non-blocking Vite chunk-size warning remains unchanged.
