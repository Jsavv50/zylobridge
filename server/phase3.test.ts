import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getJobById: vi.fn(),
    createApplication: vi.fn(),
    getDetailedApplicationsByJobId: vi.fn(),
    getDetailedApplicationsByProfessionalId: vi.fn(),
    getApplicationById: vi.fn(),
    updateApplicationStatus: vi.fn(),
    hasActiveApplication: vi.fn(),
  };
});

vi.mock("./notificationDispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

function createProfCtx() {
  return {
    ctx: {
      user: { id: 101, openId: "prof_open", role: "user" as const, userType: "professional" as const, name: "Test Pro", isVerified: true },
      req: {} as any,
      res: {} as any,
    },
  };
}

function createClientCtx() {
  return {
    ctx: {
      user: { id: 202, openId: "client_open", role: "user" as const, userType: "client" as const, name: "Test Client", isVerified: true },
      req: {} as any,
      res: {} as any,
    },
  };
}

describe("Phase 3 application submission and candidate pipeline authorization", () => {
  it("allows professional to submit an application to an open job", async () => {
    vi.mocked(db.getJobById).mockResolvedValueOnce({ id: 5, clientId: 202, status: "open" } as never);
    vi.mocked(db.hasActiveApplication).mockResolvedValueOnce(false);
    vi.mocked(db.createApplication).mockResolvedValueOnce({ id: 1, jobId: 5, professionalId: 101, status: "pending" } as never);

    const caller = appRouter.createCaller(createProfCtx().ctx);
    const result = await caller.applications.submitApplication({ jobId: 5, coverLetter: "Experienced trade specialist ready for assignment.", bidAmount: 150000 });
    expect(result).toMatchObject({ success: true });
  });

  it("prevents duplicate active applications for the same job", async () => {
    vi.mocked(db.getJobById).mockResolvedValueOnce({ id: 5, clientId: 202, status: "open" } as never);
    vi.mocked(db.hasActiveApplication).mockResolvedValueOnce(true);

    const caller = appRouter.createCaller(createProfCtx().ctx);
    await expect(caller.applications.submitApplication({ jobId: 5, coverLetter: "Experienced trade specialist ready for assignment.", bidAmount: 150000 })).rejects.toThrow();
  });

  it("enforces employer authorization for viewing job applications", async () => {
    vi.mocked(db.getJobById).mockResolvedValueOnce({ id: 5, clientId: 202, status: "open" } as never);
    const caller = appRouter.createCaller(createProfCtx().ctx); // professional trying to view employer candidates
    await expect(caller.applications.listForJob({ jobId: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
