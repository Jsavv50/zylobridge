import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("integrated marketplace workflow", () => {
  it("routes employer candidate review to the job-scoped candidate page", () => {
    const employerJobs = read("client/src/pages/EmployerJobs.tsx");
    expect(employerJobs).toContain('href={`/employer/jobs/${job.id}/candidates`}');
  });

  it("keeps review creation restricted to completed job participants and the other participant", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('if (job.status !== "completed")');
    expect(routers).toContain('if (!reviewerIsClient && !reviewerIsProfessional)');
    expect(routers).toContain('if (!expectedRevieweeId || expectedRevieweeId !== input.revieweeId)');
  });

  it("guards against duplicate reviews from the same participant for a job", () => {
    const db = read("server/db.ts");
    expect(db).toContain("eq(reviews.jobId, data.jobId)");
    expect(db).toContain("eq(reviews.reviewerId, data.reviewerId)");
    expect(db).toContain("already reviewed this completed job");
  });

  it("persists read state when a selected or deep-linked conversation opens", () => {
    const messaging = read("client/src/pages/Messaging.tsx");
    expect(messaging).toContain('new URLSearchParams(location.split("?")[1] ?? "").get("conv")');
    expect(messaging).toContain('markAsReadMutation.mutate({ conversationId: selectedConvId })');
  });

  it("joins real job and participant metadata while retaining legacy-safe fallbacks", () => {
    const db = read("server/db.ts");
    const messaging = read("client/src/pages/Messaging.tsx");
    expect(db).toContain('const conversationClient = alias(users, "conversation_client")');
    expect(db).toContain("leftJoin(jobs, eq(jobs.id, conversations.jobId))");
    expect(db).toContain("professionalName: conversationProfessional.name");
    expect(db).toContain("jobTitle: jobs.title");
    expect(messaging).toContain('const name = (isClient ? conversation.professionalName : conversation.clientName)?.trim()');
    expect(messaging).toContain('return "Marketplace conversation"');
    expect(messaging).toContain("{participantName}");
    expect(messaging).not.toContain("Job #{conv.jobId}");
  });

  it("uses the official home-linked logo and meaningful message notification context", () => {
    const messaging = read("client/src/pages/Messaging.tsx");
    const routers = read("server/routers.ts");
    expect(messaging).toContain('import ZylobridgeLogo from "@/components/ZylobridgeLogo";');
    expect(messaging).toContain("<ZylobridgeLogo compact />");
    expect(routers).toContain("const jobLabel = job?.title?.trim() || \"a marketplace job\";");
    expect(routers).toContain("regarding ${jobLabel}");
  });

  it("supports mobile list-to-thread navigation and safe viewport sizing", () => {
    const messaging = read("client/src/pages/Messaging.tsx");
    expect(messaging).toContain('navigate(`/messages?conv=${conv.id}`)');
    expect(messaging).toContain('navigate("/messages")');
    expect(messaging).toContain('h-[calc(100svh-150px)]');
    expect(messaging).toContain("break-words");
    expect(messaging).toContain('aria-label="Back to conversations"');
  });
});
