import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/ProfessionalDashboard.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");


describe("professional command center", () => {
  it("uses the existing protected marketplace systems instead of static dashboard data", () => {
    expect(page).toContain("trpc.profiles.hub.useQuery");
    expect(page).toContain("trpc.jobs.recommended.useQuery");
    expect(page).toContain("trpc.applications.commandCenter.useQuery");
    expect(page).toContain("trpc.messaging.myConversations.useQuery");
    expect(page).toContain("trpc.notifications.listUnread.useQuery");
    expect(page).toContain("trpc.finance.professionalDashboard.useQuery");
    expect(page).toContain("trpc.savedJobs.list.useQuery");
    expect(page).toContain("trpc.jobAlerts.list.useQuery");
    expect(page).toContain("trpc.marketplace.listInterviews.useQuery");
    expect(page).toContain("trpc.marketplace.listEngagements.useQuery");
    expect(page).toContain("trpc.marketplace.listOffers.useQuery");
  });

  it("keeps professional access protected at the server and client boundary", () => {
    expect(page).toContain("user?.userType === \"professional\"");
    expect(page).toContain("Professional workspace required");
    expect(router).toContain("Only professionals can manage saved jobs.");
    expect(router).toContain("Professional activity is only available to professionals.");
  });

  it("renders transparent compatibility reasons and honest unsupported analytics states", () => {
    expect(page).toContain("Rule-based compatibility");
    expect(page).toContain("reason.detail");
    expect(page).toContain("Insights coming soon");
    expect(page).toContain("No employer activity recorded");
    expect(page).not.toContain("Maggie Witt");
    expect(page).not.toContain("97% Match");
    expect(page).not.toContain("$4,820");
  });

  it("keeps required command-center destinations reachable", () => {
    for (const href of ["/jobs", "/applications", "/messages", "/notifications", "/payments", "/profile", "/profile/edit", "/verification"]) {
      expect(page).toContain(`href=\"${href}`);
    }
    expect(page).toContain("fixed inset-x-3 bottom-3");
    expect(page).toContain("lg:hidden");
  });
});
