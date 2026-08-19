import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const adminStatsSource = dbSource.slice(dbSource.indexOf("// ─── Admin Stats"), dbSource.indexOf("// ─── Conversations & Messages"));

describe("Admin Dashboard statistics query contract", () => {
  it("uses bounded PostgreSQL aggregates instead of loading entire tables", () => {
    expect(adminStatsSource).toContain("count(*) FILTER");
    expect(adminStatsSource).toContain("coalesce(sum");
    expect(adminStatsSource).toContain("db.execute(sql");
    expect(adminStatsSource).toContain("ADMIN_STATS_TIMEOUT_MS");
    expect(adminStatsSource).toContain("adminStatsCache");
    expect(adminStatsSource).not.toContain("db.select({ role: users.role, userType: users.userType }).from(users)");
    expect(adminStatsSource).not.toContain("db.select({ status: jobs.status }).from(jobs)");
    expect(adminStatsSource).not.toContain("db.select({ status: applications.status }).from(applications)");
    expect(adminStatsSource).not.toContain("db.select({ amount: escrowPayments.amount, status: escrowPayments.status }).from(escrowPayments)");
  });

  it("preserves every overview field consumed by the Admin Dashboard", () => {
    for (const field of [
      "totalUsers",
      "clientCount",
      "professionalCount",
      "enterpriseCount",
      "adminCount",
      "totalJobs",
      "openJobs",
      "inProgressJobs",
      "completedJobs",
      "cancelledJobs",
      "totalApplications",
      "pendingApplications",
      "verifiedUsers",
      "totalReviews",
      "totalEscrowAmount",
      "fundedEscrowAmount",
      "pendingVerificationCount",
    ]) {
      expect(adminStatsSource).toContain(field);
    }
  });
});
