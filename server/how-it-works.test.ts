import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("How It Works marketplace experience", () => {
  const page = read("client/src/pages/HowItWorks.tsx");
  const app = read("client/src/App.tsx");
  const navbar = read("client/src/components/Navbar.tsx");
  const footer = read("client/src/components/Footer.tsx");

  it("keeps the canonical public route, shared navigation, and footer", () => {
    expect(app).toContain('path="/how-it-works"');
    expect(app).toContain("component={HowItWorks}");
    expect(page).toContain("<Navbar />");
    expect(page).toContain("<Footer />");
    expect(navbar).toContain('href: "/how-it-works"');
    expect(navbar).toContain('location === link.href ? "text-violet-400"');
    expect(footer).toContain('href: "/how-it-works"');
  });

  it("presents both marketplace journeys with accessible in-page switching", () => {
    expect(page).toContain('type Journey = "hiring" | "professional"');
    expect(page).toContain('role="tablist"');
    expect(page).toContain('role="tab"');
    expect(page).toContain('aria-selected={value === "hiring"}');
    expect(page).toContain('aria-selected={value === "professional"}');
    expect(page).toContain('role="tabpanel"');
    expect(page).toContain('event.key === "ArrowLeft" || event.key === "ArrowRight"');
    expect(page.match(/eyebrow: "Step 0[1-6]"/g)).toHaveLength(12);
    expect(page).toContain("Hire a Professional in 6 Simple Steps");
    expect(page).toContain("Find Work in 6 Simple Steps");
  });

  it("uses only registered role-correct marketplace and workflow routes", () => {
    for (const route of ["/talent", "/jobs", "/jobs/new", "/payments", "/messages", "/verification", "/profile", "/my-work", "/terms", "/sign-in"]) {
      expect(page, route).toContain(`"${route}"`);
    }
    for (const registeredRoute of ["/talent", "/jobs", "/jobs/new", "/payments", "/messages", "/verification", "/profile", "/my-work", "/terms", "/sign-in"]) {
      expect(app, registeredRoute).toContain(`path="${registeredRoute}"`);
    }
    expect(page).not.toContain('href="/marketplace"');
  });

  it("explains the complete marketplace lifecycle and supported project workspace", () => {
    for (const stage of ["Open", "Applications", "Selected", "Funded", "In progress", "Review", "Completed", "Paid", "Reviewed"]) {
      expect(page).toContain(`label: "${stage}"`);
    }
    expect(page).toContain("Everything Stays in One Place.");
    expect(page).toContain("Conversation tied to the project");
    expect(page).toContain("Review unlocked after eligible completion");
  });

  it("keeps payment, verification, dispute, and security claims qualified", () => {
    expect(page).toContain("Paystack");
    expect(page).toContain("Ozow EFT");
    expect(page).toContain("server-verified funding workflow");
    expect(page).toContain("does not guarantee workmanship, safety, suitability, or project outcome");
    expect(page).toContain("No online service can promise absolute security");
    expect(page).toContain("This page does not make a legal or outcome guarantee");
    for (const forbidden of ["manual bank transfer", "proof of payment", "guaranteed payment", "100% safe", "Silicon Valley security standards", "within 24–48 hours", "within one business day"]) {
      expect(page.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase());
    }
  });

  it("clearly labels all illustrative project and communication content", () => {
    expect(page).toContain("Illustrative example only");
    expect(page).toContain("Illustrative workspace");
    expect(page).toContain("Illustrative conversation");
    expect(page).toContain("It is not a real customer, rating, review, transaction, or marketplace result.");
    for (const forbidden of ["★★★★★", "4.9", "Join thousands", "23 conversations", "R95,000 secured"]) {
      expect(page).not.toContain(forbidden);
    }
  });

  it("uses the canonical vocation taxonomy and truthful featured-vocation framing", () => {
    expect(page).toContain("VOCATION_LABELS");
    expect(page).toContain("VOCATION_CATEGORY_BY_KEY");
    expect(page).toContain("VOCATION_ICONS");
    expect(page).toContain("Skilled Work Across 12 Featured Vocations");
    expect(page).toContain("broader live vocation taxonomy");
    expect(page).toContain('/talent?vocation=${encodeURIComponent(key)}');
    expect(page.match(/^  "[a-z0-9_]+",$/gm)).toHaveLength(12);
  });

  it("provides accessible FAQ, focus, reduced interaction overhead, and semantic structure", () => {
    expect(page).toContain("<Accordion type=\"single\" collapsible");
    expect(page).toContain("<AccordionTrigger");
    expect(page).toContain("<AccordionContent");
    expect(page).toContain('href="#main-content"');
    expect(page).toContain('<main id="main-content">');
    expect(page).toContain("focus-visible:ring-2");
    expect(page).not.toContain("dangerouslySetInnerHTML");
    expect(page).not.toContain("framer-motion");
  });

  it("sets page-specific SEO and structured FAQ metadata without a duplicate framework", () => {
    expect(page).toContain("How ZYLOBRIDGE Works | Hire Skilled Professionals & Find Work");
    expect(page).toContain('meta[name="description"]');
    expect(page).toContain('meta[property="og:title"]');
    expect(page).toContain('link[rel="canonical"]');
    expect(page).toContain('"@type": "WebPage"');
    expect(page).toContain('"@type": "Question"');
    expect(page).toContain("https://zylobridge.com/how-it-works");
  });
});
