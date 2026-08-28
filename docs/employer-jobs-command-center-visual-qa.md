# Employer Job Lifecycle Command Center — Visual QA

## Captures

The `/employer/jobs` route was captured at 1440×1000 for the default, attention, and completed/list URL states, then at 390×844 for the default and attention states.

## Findings

The protected route presented the intended authenticated skeleton because the preview session did not contain a hiring-account session. The active **My Job Postings** sidebar state was visible on desktop, while the mobile shell collapsed to the established menu control and retained the official ZYLOBRIDGE logo. The skeleton preserves the final page hierarchy: command header, five responsive summaries, attention area, controls, and portfolio cards. Desktop uses the available width without page overflow; mobile stacks summary and portfolio placeholders into a deliberate two-column-to-single-column progression without horizontal page overflow.

The data-bearing command center could not be visually inspected in the local preview without an authenticated contractor/client account. Its populated states are covered by the server contract, TypeScript validation, and focused regression assertions; production verification should confirm the final populated rendering after auto-publish.

## Authoritative data compatibility

Read-only Supabase REST checks returned HTTP 200 for the exact job, application, engagement, and escrow columns consumed by the new aggregate. The sampled authoritative records contained seven jobs across open, in-progress, and cancelled statuses; five applications across pending, accepted, and withdrawn statuses; no engagement records; and three escrow records across pending and funded states. These values were used only to validate schema and lifecycle compatibility. No customer identity fields were retrieved, and no production records were created or modified.

The local database utility targets the project template's TiDB connection and therefore rejected PostgreSQL cast syntax during a separate aggregate check. No database migration is required for this release; the command center reuses the existing authoritative schema.
