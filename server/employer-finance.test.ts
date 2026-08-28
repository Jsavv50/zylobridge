import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Employer Escrow & Funding command center", () => {
  it("uses protected employer procedures with explicit role isolation", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("employerDashboard: protectedProcedure");
    expect(router).toContain("employerTransactions: protectedProcedure");
    expect(router).toContain("employerTransactionDetail: protectedProcedure");
    expect(router).toContain('ctx.user.userType !== "client" && ctx.user.userType !== "enterprise"');
    expect(router).toContain("Employer financial access required.");
  });

  it("derives totals and funding eligibility only from owned jobs and persisted records", () => {
    const service = read("server/employerFinance.ts");
    expect(service).toContain("getEmployerFinancialScope");
    expect(service).toContain("FINANCIAL_ORGANIZATION_ROLES");
    expect(service).toContain('eq(applications.status, "accepted")');
    expect(service).toContain('milestone.status === "draft"');
    expect(service).toContain("paymentTransactions");
    expect(service).toContain("escrowPayments");
    expect(service).toContain("engagementDisputes");
    expect(service).toContain("refunds");
    expect(service).not.toMatch(/Math\.random|mock|sample transaction/i);
  });

  it("prevents amount tampering, mismatched milestones, and duplicate funding", () => {
    const router = read("server/routers.ts");
    const finance = read("server/finance.ts");
    expect(router).toContain("const amount = Number(application.bidAmount)");
    expect(router).toContain('application.status !== "accepted"');
    expect(finance).toContain("eq(milestones.engagementId, engagement.id)");
    expect(finance).toContain("A funding request is already active for this milestone");
    expect(finance).toContain('callback_url: `${getFrontendUrl()}/payment/callback`');
    expect(finance).toContain("currency: milestone.currency");
    expect(finance).toContain("processAuthorizedVerifiedPayment");
  });

  it("removes unsupported manual bank instructions and preserves provider verification", () => {
    const router = read("server/routers.ts");
    const modal = read("client/src/components/EscrowPaymentModal.tsx");
    expect(router).toContain("Manual bank transfer is not configured. Use the secure Paystack payment method.");
    expect(router).not.toContain("1234567890");
    expect(modal).not.toContain("bank_details");
    expect(modal).not.toContain("ZYLOBRIDGE ESCROW SERVICES LTD");
    expect(modal).toContain("No card or bank credentials are collected by ZYLOBRIDGE");
  });

  it("supports both milestone and legacy payment callbacks without exposing server errors", () => {
    const callback = read("client/src/pages/PaymentCallback.tsx");
    expect(callback).toContain('reference?.startsWith("ZB-MS-")');
    expect(callback).toContain("trpc.finance.verifyPayment.useMutation");
    expect(callback).toContain("trpc.escrow.verifyPaystack.useMutation");
    expect(callback).toContain("No payment is marked funded from this screen alone.");
    expect(callback).not.toContain("activeVerify.error.message");
  });

  it("renders the requested responsive financial operating system with truthful capabilities", () => {
    const page = read("client/src/pages/Payments.tsx");
    const shell = read("client/src/components/shell/ZyloShell.tsx");
    for (const label of ["Account balance", "Held in escrow", "Pending payments", "Total spent", "Action required", "Active escrow", "Ready to fund", "Transactions", "Engagement overview", "Refunds", "Disputes", "Payment security"]) expect(page).toContain(label);
    expect(page).toContain("window.history.replaceState");
    expect(page).toContain("employerTransactionDetail");
    expect(page).toContain("!data?.capabilities.accountBalance");
    expect(page).toContain("Saved employer payment methods are not stored by ZYLOBRIDGE");
    for (const label of ["Escrow & Funding", "Settings", "Help & Support", "Profile"]) expect(shell).toContain(label);
  });
});
