import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/MyWork.tsx"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/MyWorkWorkspace.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/ProfessionalDashboard.tsx"), "utf8");

describe("professional My Work command center", () => {
  it("registers protected command center and workspace routes", () => {
    expect(app).toContain('path="/my-work"');
    expect(app).toContain('path="/my-work/:workId"');
    expect(router).toContain("myWork: router");
    expect(router).toContain("commandCenter: protectedProcedure");
    expect(router).toContain("workspace: protectedProcedure");
    expect(router).toContain('ctx.user.userType !== "professional"');
    expect(dashboard).toContain('["My Work", "/my-work"');
  });

  it("uses ownership-scoped existing engagement architecture", () => {
    expect(db).toContain("eq(engagements.professionalId, professionalId)");
    expect(db).toContain("innerJoin(jobs, eq(jobs.id, engagements.jobId))");
    expect(db).toContain("inArray(milestones.engagementId, engagementIds)");
    expect(db).toContain("inArray(paymentTransactions.engagementId, engagementIds)");
    expect(db).toContain("eq(conversations.professionalId, professionalId)");
    expect(db).toContain("eq(messages.isRead, false)");
    expect(db).toContain("unreadByConversation");
    expect(db).not.toContain("seed");
    expect(db).not.toContain("mockWork");
  });

  it("supports real filters, deterministic priority rules, and pagination", () => {
    expect(db).toContain('status?: "all" | "active" | "starting" | "awaiting_client" | "in_review" | "completed" | "cancelled"');
    expect(db).toContain("filters.search?.trim().toLowerCase()");
    expect(db).toContain("filters.status && filters.status !== \"all\"");
    expect(db).toContain("daysUntilDeadline <= 3");
    expect(db).toContain("slice(offset, offset + limit)");
    expect(page).toContain("Search your work...");
    expect(page).toContain("statusTabs");
    expect(page).toContain("Recently updated");
  });

  it("keeps workspace links and supported payment, message, and notification integrations contextual", () => {
    expect(page).toContain("/my-work/${item.engagement.id}");
    expect(workspace).toContain("/jobs/${item.job.id}");
    expect(workspace).toContain('href="/messages"');
    expect(workspace).toContain('href="/notifications"');
    expect(workspace).toContain('href="/payments"');
    expect(workspace).toContain("No milestones are recorded");
    expect(workspace).toContain("Additional task and file workflows are not represented until persisted records exist.");
  });

  it("does not fabricate metrics, client messages, tasks, files, or payment states", () => {
    expect(page).not.toContain("R45,000");
    expect(page).not.toContain("Install electrical panel");
    expect(page).not.toContain("75%");
    expect(page).not.toContain("Client has not responded");
    expect(workspace).not.toContain("Milestone 3");
    expect(workspace).not.toContain("R8,000 in Escrow");
    expect(db).toContain("amountInEscrowMinor");
  });
});
