# Talent Discovery Visual QA

## Desktop public route

The `/talent` route settled correctly after the authentication bootstrap and rendered the public, read-only discovery workspace rather than remaining on its initial skeleton. The page displays the official ZYLOBRIDGE branding, the specified hero copy, search controls, popular vocation chips, real-data summary cards, desktop filter sidebar, sort selector, and list/grid controls. The current preview database returned zero visible profiles, and the workspace represented that state truthfully without fabricated professionals, ratings, or marketplace totals.

The first screenshot captured the intentional authentication skeleton before the session state resolved. A subsequent browser inspection confirmed the final rendered page. The public navigation exposes Browse Jobs and Browse Talent; hiring actions redirect unauthenticated visitors through sign-in. The main desktop layout remains contained within the viewport, while the horizontal vocation chip rail is deliberately scrollable.

## Follow-up checks

The 390px capture confirmed that the navigation collapses to its mobile menu, the logo and primary account action remain visible, and the page stays within the narrow viewport. The initial mobile capture showed the intentional data skeleton while the directory request was active; cards stack to one column and do not create horizontal page overflow.

After removing the dependency on a completed auth bootstrap for public rendering, the 1440px capture showed the full talent workspace immediately: branded hero, search, horizontally scrollable vocation chips, four real-data insight cards, contained filter sidebar, sort control, and list/grid controls. The screenshot environment's direct PostgreSQL connection timed out, so result cards remained in their truthful loading state. A separate authoritative Supabase execution of the same aggregate predicates succeeded and returned 7 visible professional profiles, 7 currently available profiles, 2 verified accounts, and 0 profiles with recorded reviews. The timeout was an environment connection failure, not fabricated zero-result data or a schema/query mismatch.

Role-aware redirect logic is covered by focused tests. Authenticated employer-only actions still require a client or enterprise session with an owned open job and were not executed during visual QA, avoiding production data mutation.
