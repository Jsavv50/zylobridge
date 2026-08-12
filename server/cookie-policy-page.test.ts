import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

async function readProjectFile(relativePath: string) {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

describe("static Cookie Policy frontend integration", () => {
  it("registers a public route, preserves the footer link, and omits the CookieYes policy script", async () => {
    const [page, app, footer, html] = await Promise.all([
      readProjectFile("client/src/pages/CookiePolicy.tsx"),
      readProjectFile("client/src/App.tsx"),
      readProjectFile("client/src/components/Footer.tsx"),
      readProjectFile("client/index.html"),
    ]);

    expect(app).toContain('path="/cookie-policy" component={CookiePolicy}');
    expect(footer).toContain('{ href: "/cookie-policy", label: "Cookie Policy" }');
    expect(page).toContain("window.revisitCkyConsent");
    expect(page).toContain("CookieYes sets this cookie for consent solution management.");
    expect(page).toContain('target="_blank"');
    expect(page).toContain('rel="noopener noreferrer"');
    expect(page).toContain('document.title = "Cookie Policy | Zylobridge"');
    expect(page).toContain(
      '"Learn how Zylobridge uses cookies and similar technologies and how you can manage your cookie preferences."'
    );
    expect(page).not.toContain("cookie-policy/script.js");
    expect(page).not.toContain("cky-cookie-policy");
    expect(html).toContain('id="cookieyes"');
    expect(html).not.toContain("cookie-policy/script.js");
  });
});
