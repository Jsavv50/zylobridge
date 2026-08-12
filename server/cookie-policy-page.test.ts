import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

async function readProjectFile(relativePath: string) {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

describe("Cookie Policy frontend integration", () => {
  it("registers a public route, a footer link, and a page-scoped CookieYes policy script", async () => {
    const [page, app, footer, html] = await Promise.all([
      readProjectFile("client/src/pages/CookiePolicy.tsx"),
      readProjectFile("client/src/App.tsx"),
      readProjectFile("client/src/components/Footer.tsx"),
      readProjectFile("client/index.html"),
    ]);

    expect(app).toContain('path="/cookie-policy" component={CookiePolicy}');
    expect(footer).toContain('{ href: "/cookie-policy", label: "Cookie Policy" }');
    expect(page).toContain('const COOKIE_POLICY_SCRIPT_ID = "cky-cookie-policy"');
    expect(page).toContain('policyScript.src = COOKIE_POLICY_SCRIPT_URL');
    expect(page).toContain('document.title = "Cookie Policy | Zylobridge"');
    expect(html).not.toContain("cookie-policy/script.js");
  });
});
