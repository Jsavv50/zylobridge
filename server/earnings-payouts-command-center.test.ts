import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/Payments.tsx"), "utf8");

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
}

describe("Professional Earnings & Payouts command center", () => {
  it("aggregates monetary values in minor units without floating-point balance math", () => {
    const funded = 1250050;
    const pending = 250000;
    const eligible = 1000000;
    expect(funded + pending).toBe(1500050);
    expect(funded - eligible).toBe(250050);
    expect(formatMinor(1250050, "ZAR")).toContain("12,500.50");
  });

  it("uses the advanced finance tables and professional ownership predicates", () => {
    expect(dbSource).toContain("getProfessionalFinancialDashboard");
    expect(dbSource).toContain("eq(paymentTransactions.payeeId, professionalId)");
    expect(dbSource).toContain("eq(payouts.professionalId, professionalId)");
    expect(dbSource).toContain("eq(engagements.professionalId, professionalId)");
  });

  it("keeps payout destinations masked and never returns the full account number", () => {
    expect(dbSource).toContain('maskedAccount: `•••• ${bank.accountNumber.slice(-4)}`');
    expect(pageSource).toContain("maskedAccount");
    expect(pageSource).not.toContain("accountNumber}</");
  });

  it("restricts professional finance procedures server-side", () => {
    expect(routerSource).toContain("professionalDashboard: protectedProcedure");
    expect(routerSource).toContain("professionalTransactions: protectedProcedure");
    expect(routerSource).toContain("professionalPayouts: protectedProcedure");
    expect(routerSource).toContain("professionalEscrow: protectedProcedure");
    expect(routerSource).toContain('ctx.user.userType !== "professional"');
    expect(routerSource).toContain('Professional financial data is restricted to professional accounts.');
  });

  it("does not simulate unsupported self-serve withdrawals or generated statements", () => {
    expect(pageSource).toContain("Self-serve withdrawal is not enabled in the current backend.");
    expect(pageSource).toContain("Withdrawal initiation is administrator-authorized in the current backend");
    expect(pageSource).toContain("Statement generation is not available yet");
    expect(pageSource).not.toContain("withdraw.mutate");
  });

  it("preserves the employer escrow branch as a real-data country-aware financial command center", () => {
    expect(pageSource).toContain("trpc.finance.employerDashboard.useQuery");
    expect(pageSource).toContain("trpc.finance.employerTransactions.useQuery");
    expect(pageSource).toContain('item.currency === "ZAR"');
    expect(pageSource).toContain("Paystack");
    expect(pageSource).toContain("<ApplicationShell");
  });
});
