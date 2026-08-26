# Phase 2 Browser Smoke Notes

The local managed preview server is running and the API health route responds with `{"status":"ok","service":"Zylobridge API"}`. The TypeScript checker reports no errors and the production build emitted the new lazy chunks for `JobsMarketplace`, `JobDetail`, `JobPosting`, `TalentDirectory`, `ProfessionalProfilePage`, and `CompanyProfile`.

The browser preview endpoint currently displays the managed preview-mode notice rather than the application body, so no authenticated or database-backed UI acceptance claim is made from this browser session. Browser console inspection showed no console errors. Production acceptance remains limited to the local build/type/test evidence unless a live published URL is available for a separate check.

## Additional route checks

After restarting the development server, `/jobs` rendered the canonical “Find work that moves your career forward” experience with shared navigation, server-side filter controls, a reset action, empty-state handling, and post-a-job CTAs. `/talent` rendered the canonical “Find trusted professionals” experience with search, vocation, location, sorting, availability, and verification filters plus an empty state. Both routes loaded without browser console errors in the preview session. The preview was unauthenticated and the local database returned empty result sets, so these checks validate rendering and route wiring rather than production data availability.

## Protected posting route

Unauthenticated navigation to `/jobs/new` redirected to `/sign-in`. The sign-in screen rendered the existing Google, Email, and Phone entry points with no runtime error. This confirms the posting page does not expose a protected mutation surface to an unauthenticated visitor.
