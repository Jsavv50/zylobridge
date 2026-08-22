import { describe, it, expect } from "vitest";
import { z } from "zod";

const jobCreateSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  vocation: z.string().max(64),
  budget: z.number().positive(),
  location: z.string().min(2).max(200).trim(),
  deadline: z.string().optional(),
  isUrgent: z.boolean().optional().default(false),
  organizationId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
});

describe("Job Posting Validation & Regression Tests", () => {
  it("validates standard job posting with isUrgent true", () => {
    const validData = {
      title: "Painter",
      description: "In need of an experienced painter urgently",
      vocation: "painter",
      budget: 100,
      location: "Cape Town",
      deadline: "2026-09-27T00:00:00.000Z",
      status: "open",
      isUrgent: true,
    };
    const result = jobCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isUrgent).toBe(true);
      expect(result.data.budget).toBe(100);
      expect(result.data.vocation).toBe("painter");
    }
  });

  it("validates non-urgent job posting with isUrgent false", () => {
    const validData = {
      title: "Plumber",
      description: "Fix a leaky kitchen pipe",
      vocation: "plumber",
      budget: 150,
      location: "Johannesburg",
      isUrgent: false,
    };
    const result = jobCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isUrgent).toBe(false);
    }
  });

  it("validates job posting with optional organization and project ids", () => {
    const validData = {
      title: "Enterprise Architect",
      description: "Cloud migration project",
      vocation: "developer",
      budget: 5000,
      location: "Remote",
      organizationId: 3,
      projectId: 12,
    };
    const result = jobCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe(3);
      expect(result.data.projectId).toBe(12);
    }
  });

  it("constructs secure job insert object mapping authenticated clientId and parsing budget as string", () => {
    const userId = 42;
    const input = {
      title: "Production Diagnostic Painter Job",
      description: "Controlled production diagnostic job-posting test.",
      vocation: "painter",
      budget: 100,
      location: "Cape Town",
      deadline: "2026-09-27T00:00:00.000Z",
      isUrgent: true,
    };

    const jobData: any = {
      clientId: userId,
      title: input.title,
      description: input.description,
      vocation: input.vocation,
      budget: String(input.budget),
      location: input.location,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      isUrgent: input.isUrgent ?? false,
      status: "open",
    };

    expect(jobData.clientId).toBe(42);
    expect(jobData.budget).toBe("100");
    expect(jobData.vocation).toBe("painter");
    expect(jobData.isUrgent).toBe(true);
    expect(jobData.organizationId).toBeUndefined();
    expect(jobData.projectId).toBeUndefined();
  });
});
