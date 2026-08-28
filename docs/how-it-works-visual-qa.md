# How It Works — Visual and Production QA

## Local preview

The redesigned `/how-it-works` route rendered successfully with the canonical ZYLOBRIDGE header and footer, complete hero, dual role CTAs, accessible Contractor / Client and Skilled Professional journey tabs, lifecycle, illustrative story, supported funding explanation, trust and verification sections, featured canonical vocations, security guidance, dispute paths, FAQ, and closing calls to action.

The first 1440px full-page screenshot attempt failed in the capture runner without a corresponding page runtime or TypeScript error. A direct browser render subsequently loaded the page title, full interactive element tree, and all major sections successfully. The first viewport showed readable contrast, clear hierarchy, contained CTAs, and the active How It Works navigation state.

The 390px full-page capture rendered the entire page without horizontal overflow, clipped cards, or broken stacking. The hero, role chooser, six-step cards, vertical lifecycle, illustrative blocks, payment methods, benefit cards, vocation links, security cards, dispute scenarios, grouped FAQ, final CTAs, and footer all collapsed into a usable single-column mobile flow. Touch targets and text remained contained. The deliberately comprehensive page is long on mobile, but uses section hierarchy and accordions to preserve scannability.

A subsequent 1280px full-page capture succeeded. The desktop layout uses an asymmetric hero, balanced six-step grids, a horizontal nine-stage lifecycle, paired workspace and communication panels, two-column benefit and comparison sections, four-column vocation/security grids, and a contained footer. Visual hierarchy, whitespace, contrast, CTA prominence, and responsive section transitions were coherent throughout. An independent style review considered the dark trust-oriented atmosphere, violet/cyan role framing, escrow diagrams, and dual-audience structure consistent and polished; its optional recommendations for a more ownable bridge motif are suitable for a future brand-art pass rather than required functionality.

No broken image dependency was introduced; the page uses the canonical logo and lightweight icon components only. Non-critical animations are limited to short CSS transitions, and keyboard focus styles are preserved.

## Production

Checkpoint `88e9beb6` initially encountered the previous page bundle in the persistent browser cache. The current live entry bundle was then inspected and confirmed to reference the new `HowItWorks` chunk. A fresh cache-busted navigation to `https://zylobridge.com/how-it-works` settled with the expected SEO title and rendered the complete redesign under the authenticated enterprise navigation: new hero, role journey controls, six-step hiring flow, nine-stage lifecycle, illustrative-only story and workspace, Paystack/Ozow funding explanation, verification limitations, canonical vocation links, grouped FAQ, and role-aware final workspace CTA. No broken asset or runtime boundary appeared.

The live role selector was then activated through its accessible `journey-professional-tab` control. The page updated in place from **Hire a Professional in 6 Simple Steps** to **Find Work in 6 Simple Steps**, surfaced the expected Build Your Profile, Start Verification, Browse Jobs, and Open My Work links, and preserved the rest of the page without navigation or reload. This confirms the production role switch is functional and the two informational journeys remain independent of backend requests.

The first FAQ trigger was also activated through its generated accessible ID. Its `aria-expanded` value changed to `true`, and the associated panel exposed the full account-cost answer. This confirms the Radix accordion wiring, keyboard-compatible trigger semantics, and production answer rendering are functional.
