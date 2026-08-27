export type JobCurrency = "NGN" | "ZAR";

export function normalizeJobCurrency(value: string | null | undefined): JobCurrency {
  return value === "ZAR" ? "ZAR" : "NGN";
}

export function jobCurrencySymbol(value: string | null | undefined): string {
  return normalizeJobCurrency(value) === "ZAR" ? "R" : "₦";
}

export function formatJobBudget(value: string | number, currency: string | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Budget not specified";
  return `${jobCurrencySymbol(currency)}${amount.toLocaleString()}`;
}
