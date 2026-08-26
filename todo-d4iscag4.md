# Project TODO

- [x] Confirm the specific product, UI, or backend changes requested for this editing session.
- [x] Inspect the existing application pages, shared components, styling, data model, and active design decisions before implementation.
- [x] Implement confirmed user-requested changes while preserving the project’s professional Silicon Valley standard.
- [x] Add or update Vitest coverage for every implemented feature or bug fix. Direct regression coverage exists in `server/logo-integration.test.ts`.
- [x] Run type checks, tests, and visual verification before delivery.
- [x] Save a checkpoint with all completed items marked as [x].

## Baseline Notes

- Project: ZYLOBRIDGE
- Current domains: zylomarket-wuxyqzod.manus.space and zylobridge.manus.space
- Current architecture: React 19, Tailwind 4, Express 4, tRPC 11, Drizzle ORM, Manus OAuth, and database-backed server features.
- User direction: Maintain a professional Silicon Valley standard and professional structure throughout.
- [x] Review the homepage’s testimonial section: it previously presented named Trustpilot/Google reviews and ratings that required verified source data or removal before production use.
- [ ] Review homepage asset references such as `/ZYLO.png` against the project’s managed asset-storage rules.
- [ ] Review and resolve the existing realtime-auth warning if realtime features are part of the requested scope.
- [x] Remove unverified homepage testimonials, third-party review badges, rating aggregates, and related fabricated social-proof claims while preserving the page’s visual hierarchy.
