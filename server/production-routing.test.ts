import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("production route registry", () => {
  it("registers the affected feature pages and canonical enterprise aliases", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('const Notifications = lazy(() => import("./pages/Notifications"));');
    expect(app).toContain('const Payments = lazy(() => import("./pages/Payments"));');
    expect(app).toContain('<Route path="/notifications" component={Notifications} />');
    expect(app).toContain('<Route path="/payments" component={Payments} />');
    expect(app).toContain('<Route path="/enterprise" component={EnterpriseDashboard} />');
    expect(app).toContain('<Route path="/organization" component={EnterpriseDashboard} />');
    expect(read("client/src/pages/Notifications.tsx")).toContain("trpc.notifications.listUnread.useQuery");
    expect(read("client/src/pages/Payments.tsx")).toContain("trpc.jobs.myJobs.useQuery");
  });

  it("keeps affected navigation targets aligned with registered routes", () => {
    const shell = read("client/src/components/shell/ZyloShell.tsx");
    expect(shell).toContain('{ href: "/notifications", label: "Notifications"');
    expect(shell).toContain('{ href: "/payments", label: "Escrow & Funding"');
    expect(shell).toContain('{ href: "/enterprise", label: "Enterprise Org"');
    expect(read("client/src/pages/EnterpriseDashboard.tsx")).toContain('href: "/marketplace"');
  });

  it("preserves the Vercel filesystem-first SPA fallback", () => {
    const vercel = read("vercel.json");
    expect(vercel).toContain('"handle": "filesystem"');
    expect(vercel).toContain('"dest": "/index.html"');
  });
});
