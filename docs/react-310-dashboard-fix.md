# Contractor/Client Dashboard React #310 Fix

**Date:** August 28, 2026

## Root cause

`client/src/pages/ClientDashboard.tsx` called `useMemo` only after four conditional returns for missing authentication, unauthorized role, query loading, and query error/missing data. During the production transition from an authentication or loading render to a populated dashboard render, React encountered one additional hook and raised minified error #310 (`Rendered more hooks than during the previous render`).

The `attention` memo now executes unconditionally with the component’s other hooks and returns an empty array when dashboard data is unavailable. Optional dashboard collections and aggregates are normalized before the successful render branch. The authorized dashboard query now enables for client, enterprise, admin, and super-admin account contexts handled by the page’s role guard.

## Route and recovery changes

`/employer` is the canonical dashboard. `/dashboard/contractor` and `/dashboard/client` now declaratively redirect to `/employer` with replacement semantics, while current Navbar, homepage, and onboarding links point directly to the canonical route. A dashboard-scoped error boundary preserves the application shell, offers retry and home navigation, emits safe console diagnostics, and reports to Sentry only when a global Sentry client is present. The global fallback no longer renders raw stack traces.

## Preview verification

The first local preview visit exposed an esbuild development transform service that had stopped after sandbox memory cleanup; the managed development services were restarted. A second direct visit to `/employer` completed the unauthenticated route guard and reached `/sign-in` without React #310, a hook-order warning, a blank page, or an error-boundary fallback. Authenticated transition coverage is enforced by the hook-order regression suite and will be rechecked against production after deployment.

A direct visit to `/dashboard/contractor` then performed one replacement navigation to `/employer` and continued through the existing unauthenticated guard to `/sign-in`; session replay showed no redirect loop. Recent browser, network, and server logs contained no React #310, “Rendered more hooks,” “Rendered fewer hooks,” invalid-hook, dashboard-boundary, or global-boundary events from either route.

## Validation

The focused dashboard suites passed 9/9 assertions. The complete repository suite passed 61 files and 262 tests, TypeScript completed without errors, and both client and server production builds succeeded. The repository does not currently define a lint script, so no standalone lint command was available; TypeScript, Vitest, Vite/esbuild compilation, and `git diff --check` supplied the configured static and build validation. Existing non-blocking warnings remain for the pnpm configuration field and the large Vite entry chunk.
