# Adaptive Onboarding Visual QA

## Validation context

This document records non-mutating quality assurance for the adaptive onboarding and profile-completion release. No onboarding completion, role assignment, organization creation, payment, order, or other production record was created during these checks.

## Runtime checks

| Check | Result |
|---|---|
| Local API health (`/api/health`) | HTTP 200 |
| Local onboarding route (`/onboarding?mode=profile`) | HTTP 200 |
| Vite root shell | Present |
| TypeScript language service after restart | No errors |

## Preview observations

The previously issued temporary preview URL displayed the Manus sandbox unavailable screen. Selecting **Wake up** reached the sandbox wake-up flow but had not yet returned a refreshed preview URL at this checkpoint. This is an infrastructure-preview limitation, not evidence of an application runtime failure: the restarted local server, route shell, full TypeScript check, client build, and server build all passed.

## Fresh preview observations

A fresh temporary endpoint was acquired from the restarted server. At desktop width, `/onboarding?mode=profile` resolved to the **ZYLOBRIDGE** application title and the preview wrapper loaded, but the application viewport remained an empty dark shell after a follow-up page inspection. No interactive element or onboarding copy was exposed in the rendered DOM state. This state requires console and network diagnosis before it can be accepted as visual QA.

The browser console remained empty. Document inspection confirmed `readyState: complete`; the Vite client, application entry script, cookie-consent script, and preview diagnostics script were loaded. However, the React root contained only the live notification region and no route content. This narrows the issue to an application-level null-render path—most likely authentication/bootstrap gating—rather than failed HTML or JavaScript asset delivery.

Further browser probes returned HTTP 200 from `auth.me` with an unauthenticated `null` user, and a direct dynamic import of `client/src/pages/Onboarding.tsx` succeeded with the expected default export. The authentication transport and the onboarding route module are therefore individually available. The route tree had not requested the onboarding module before this probe, so routing/render lifecycle remains the narrowed investigation area.

## Blank-screen correction verification

The onboarding page now redirects unauthenticated visitors from `/onboarding?mode=profile` to `/sign-in?next=%2Fonboarding%3Fmode%3Dprofile` with replacement semantics. Desktop verification confirmed that the full ZYLOBRIDGE SignIn interface renders with logo, home escape route, Google, email, and phone authentication options, legal links, and preserved profile-completion intent. The previous empty dark viewport is no longer present.

The SignIn screenshot also exposed a pre-existing unsupported marketplace-scale phrase (“Join thousands…”). It must be replaced with truthful non-quantified language before this release is accepted under the onboarding no-fabrication requirement.

Mobile verification at 390 × 844 confirmed the corrected SignIn handoff renders without horizontal overflow. The logo and home escape route remain visible, all three authentication methods retain clear full-width tap targets, the updated non-quantified marketplace copy wraps cleanly, security labels remain legible, and Terms of Service and Privacy Policy links remain reachable. The onboarding route’s `next` value continues to preserve profile-completion intent.

## Pre-release production baseline

Before publishing the onboarding changes, `https://zylobridge.com/onboarding?mode=profile` reached the current production application but remained on its existing loading spinner, with the cookie-consent banner visible. The current production bundle does not yet contain this session’s onboarding changes, so this observation is treated only as a baseline; it is not an authenticated pass or failure for the release candidate.

## Authoritative database compatibility

A bounded, read-only metadata query against the active **Zylobridge-db** Supabase project confirmed the applied `users` columns: `onboardingStatus` (`onboarding_status`, required), `onboardingStep` (integer, required), `onboardingRevision` (integer, required), `onboardingData` (JSONB, required), and `onboardingCompletedAt` (nullable timestamp). No account, profile, organization, onboarding, payment, order, or other production record was inserted or updated during verification.

Further desktop and mobile rendering observations will be appended after diagnosing this fresh-preview rendering state.
