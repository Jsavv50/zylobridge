# How It Works — Visual and Production QA

## Local preview

The redesigned `/how-it-works` route rendered successfully with the canonical ZYLOBRIDGE header and footer, complete hero, dual role CTAs, accessible Contractor / Client and Skilled Professional journey tabs, lifecycle, illustrative story, supported funding explanation, trust and verification sections, featured canonical vocations, security guidance, dispute paths, FAQ, and closing calls to action.

The first 1440px full-page screenshot attempt failed in the capture runner without a corresponding page runtime or TypeScript error. A direct browser render subsequently loaded the page title, full interactive element tree, and all major sections successfully. The first viewport showed readable contrast, clear hierarchy, contained CTAs, and the active How It Works navigation state.

The 390px full-page capture rendered the entire page without horizontal overflow, clipped cards, or broken stacking. The hero, role chooser, six-step cards, vertical lifecycle, illustrative blocks, payment methods, benefit cards, vocation links, security cards, dispute scenarios, grouped FAQ, final CTAs, and footer all collapsed into a usable single-column mobile flow. Touch targets and text remained contained. The deliberately comprehensive page is long on mobile, but uses section hierarchy and accordions to preserve scannability.

A subsequent 1280px full-page capture succeeded. The desktop layout uses an asymmetric hero, balanced six-step grids, a horizontal nine-stage lifecycle, paired workspace and communication panels, two-column benefit and comparison sections, four-column vocation/security grids, and a contained footer. Visual hierarchy, whitespace, contrast, CTA prominence, and responsive section transitions were coherent throughout. An independent style review considered the dark trust-oriented atmosphere, violet/cyan role framing, escrow diagrams, and dual-audience structure consistent and polished; its optional recommendations for a more ownable bridge motif are suitable for a future brand-art pass rather than required functionality.

No broken image dependency was introduced; the page uses the canonical logo and lightweight icon components only. Non-critical animations are limited to short CSS transitions, and keyboard focus styles are preserved.
