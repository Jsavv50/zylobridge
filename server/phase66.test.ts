import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("Phase 66 candidate actions, escrow, realtime, and notifications", () => {
  it("renders Message only for non-rejected candidates and Fund Escrow only for accepted candidates", () => {
    const source = read("../client/src/pages/EmployerCandidates.tsx");
    expect(source).toContain('app.status === "accepted"');
    expect(source).toContain('app.status === "accepted"');
    expect(source).toContain("EscrowPaymentModal");
    expect(source).toContain("Review Profile");
  });

  it("enforces accepted application status and server-derived bid amount for escrow", () => {
    const source = read("./routers.ts");
    expect(source).toContain('application.status !== "accepted"');
    expect(source).toContain("const fundingAmount = Number(application.bidAmount)");
    expect(source).toContain('["pending", "funded", "released"].includes(existing.status)');
    expect(source).not.toContain("amount: input.amount,");
  });

  it("blocks rejected professionals from initiating candidate-pipeline conversations", () => {
    const source = read("./routers.ts");
    expect(source).toContain('applicant?.status === "rejected"');
    expect(source).toContain("Rejected applicants cannot be messaged.");
  });

  it("uses the production Railway fallback for Realtime authorization", () => {
    const source = read("../client/src/lib/supabase.ts");
    const serverSource = read("./_core/realtimeAuth.ts");
    expect(source).toContain('import.meta.env.PROD ? "https://api.zylobridge.com" : ""');
    expect(source).toContain('credentials: "include"');
    expect(serverSource).toContain(".setIssuedAt(issuedAt)");
  });

  it("persists message and account events through the canonical notification dispatcher", () => {
    const router = read("./routers.ts");
    const dispatcher = read("./notificationDispatcher.ts");
    const page = read("../client/src/pages/Notifications.tsx");
    expect(router).toContain('idempotencyKey: `message:${message.id}`');
    expect(router).toContain('idempotencyKey: `application-status:${app.id}:${input.status}`');
    expect(router).toContain('idempotencyKey: `escrow-funded:${escrow.id}`');
    expect(router).toContain('idempotencyKey: `verification-review:${req.id}:${input.status}`');
    expect(router).toContain('idempotencyKey: `user-role:${input.userId}:${input.role}`');
    expect(dispatcher).toContain("referenceType: event.entityType");
    expect(page).toContain('notification.referenceType === "conversation"');
    expect(page).toContain('setLocation(href)');
  });
});
