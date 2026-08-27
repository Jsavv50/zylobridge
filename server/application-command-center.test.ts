import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { deriveApplicationStage, applicationStageMessage } from "../shared/applicationLifecycle";

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, file), "utf8");

describe("application command center", () => {
  it("derives only supported lifecycle stages from authoritative records", () => {
    expect(deriveApplicationStage({ applicationStatus: "pending" })).toBe("under_review");
    expect(deriveApplicationStage({ applicationStatus: "pending", shortlisted: true })).toBe("shortlisted");
    expect(deriveApplicationStage({ applicationStatus: "pending", interviewStatus: "confirmed" })).toBe("interview");
    expect(deriveApplicationStage({ applicationStatus: "accepted" })).toBe("accepted");
    expect(deriveApplicationStage({ applicationStatus: "accepted", jobStatus: "in_progress", engagementStatus: "active" })).toBe("active");
    expect(deriveApplicationStage({ applicationStatus: "accepted", jobStatus: "completed", engagementStatus: "completed" })).toBe("completed");
    expect(deriveApplicationStage({ applicationStatus: "withdrawn", shortlisted: true })).toBe("withdrawn");
    expect(applicationStageMessage("under_review")).toContain("awaiting employer review");
  });

  it("keeps the command center protected and server-backed", () => {
    const router = read("routers.ts");
    const db = read("db.ts");
    expect(router).toContain("commandCenter: protectedProcedure");
    expect(router).toContain("detail: protectedProcedure");
    expect(router).toContain("getProfessionalApplicationById(input.id, ctx.user.id)");
    expect(db).toContain("eq(applications.professionalId, professionalId)");
    expect(db).toContain("eq(applications.id, id), eq(applications.professionalId, professionalId)");
  });

  it("exposes real integrations and responsive states without placeholder records", () => {
    const page = read("../client/src/pages/ProfessionalApplications.tsx");
    const detail = read("../client/src/pages/ApplicationDetail.tsx");
    const notifications = read("../client/src/pages/Notifications.tsx");
    expect(page).toContain("trpc.applications.commandCenter.useQuery");
    expect(page).toContain("trpc.messaging.getOrCreateConversation.useMutation");
    expect(page).toContain("Withdraw application");
    expect(page).toContain("No applications yet");
    expect(page).toContain("We couldn't load your applications");
    expect(page).toContain("formatJobBudget");
    expect(detail).toContain("trpc.applications.detail.useQuery");
    expect(detail).toContain("/payments");
    expect(detail).toContain("Application timeline");
    expect(notifications).toContain("/applications/${referenceId}");
    expect(page).not.toContain("Maggie Witt");
    expect(page).not.toContain("Sherry Witt");
  });
});
