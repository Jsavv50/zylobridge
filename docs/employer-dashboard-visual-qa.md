# Employer Dashboard Visual QA

## Captures

The `/employer` route was captured at 1280×720 and 390×844. Both captures loaded the shared Zylobridge application shell successfully and showed the correct unauthenticated loading state because no authenticated employer session was available in the preview capture context.

## Findings

The desktop capture confirms the branded shell, wide-screen sidebar, and centered loading treatment. The mobile capture confirms the compact header with accessible navigation toggle, official Zylobridge logo, touch-sized Get Started action, and no visible horizontal overflow. The authenticated dashboard sections require an employer session for meaningful visual verification; the implementation includes server-backed loading, error, empty, and data states rather than fabricated preview records.
