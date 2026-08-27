import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Landmark,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";
import { formatJobBudget } from "@shared/currency";

function formatMinor(minor: number, currency: string) {
  const amount = Number(minor || 0) / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function humanStatus(status: string) {
  return status.replace(/^payout_/, "").replace(/_/g, " ");
}

function statusTone(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  if (["funded", "payment_confirmed", "payout_completed", "released", "approved"].includes(status)) return "success";
  if (["failed", "refunded", "disputed", "payout_reversed"].includes(status)) return "error";
  if (["payment_pending", "payment_required", "payment_initiated", "payout_pending", "payout_processing", "payout_eligible"].includes(status)) return "warning";
  return "info";
}

function MetricCard({ label, value, detail, icon: Icon, tone = "default" }: { label: string; value: string; detail: string; icon: typeof WalletCards; tone?: "default" | "success" | "warning" }) {
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-3 text-2xl font-semibold tracking-tight ${tone === "success" ? "text-emerald-300" : tone === "warning" ? "text-amber-200" : "text-foreground"}`}>{value}</p></div>
      <div className="rounded-xl border border-border bg-background/60 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
    </div>
    <p className="mt-3 text-sm leading-5 text-muted-foreground">{detail}</p>
  </article>;
}

function LoadingCards() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading earnings summary">
    {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border border-border bg-card/70" />)}
  </div>;
}

function ProfessionalPayments() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [transactionPage, setTransactionPage] = useState(0);
  const pageSize = 20;
  const dashboard = trpc.finance.professionalDashboard.useQuery(undefined, { staleTime: 30_000 });
  const transactions = trpc.finance.professionalTransactions.useQuery({ search: search.trim() || undefined, status: status === "all" ? undefined : status, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, limit: pageSize, offset: transactionPage * pageSize });
  const payouts = trpc.finance.professionalPayouts.useQuery({ limit: 20, offset: 0 });
  const protectedEscrow = trpc.finance.professionalEscrow.useQuery();
  const firstCurrency = dashboard.data?.currencies?.[0];
  const monthBars = useMemo(() => {
    if (!firstCurrency) return null;
    const max = Math.max(firstCurrency.currentMonthEarningsMinor, firstCurrency.previousMonthEarningsMinor, 1);
    return { current: Math.max(5, (firstCurrency.currentMonthEarningsMinor / max) * 100), previous: Math.max(5, (firstCurrency.previousMonthEarningsMinor / max) * 100) };
  }, [firstCurrency]);

  if (!user) return null;
  const currencies = dashboard.data?.currencies ?? [];
  const canShowFinancials = user.userType === "professional" || user.role === "admin" || user.role === "SUPER_ADMIN";

  if (!canShowFinancials) return <ApplicationShell role="professional"><PageHeader title="Earnings & Payouts" description="Professional financial data is only available to professional accounts." /><EmptyState icon={LockKeyhole} title="Professional access required" description="Switch to a professional account to view earnings, protected escrow, and payout readiness." action={<Link href="/applications"><Button variant="outline">View applications <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>} /></ApplicationShell>;

  const totals = currencies.length === 1 ? currencies[0] : null;
  const currencySummary = currencies.length > 1 ? "Multiple currencies" : totals ? formatMinor(totals.totalEarningsMinor, totals.currency) : "No earnings yet";
  const availableSummary = totals ? formatMinor(totals.availableBalanceMinor, totals.currency) : "Pending data";
  const pendingSummary = totals ? formatMinor(totals.pendingEarningsMinor, totals.currency) : "No pending earnings";
  const escrowSummary = totals ? formatMinor(totals.protectedEscrowMinor, totals.currency) : "No protected escrow";
  const transactionTotal = transactions.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(transactionTotal / pageSize) - 1);
  const lifecycleSignals = [
    totals && totals.protectedEngagementCount > 0 ? { label: "Employer-funded escrow", detail: `${totals.protectedEngagementCount} funded milestone${totals.protectedEngagementCount === 1 ? "" : "s"} currently protected`, tone: "success" as const } : null,
    totals && totals.completedPaidEngagements > 0 ? { label: "Confirmed earnings", detail: `${totals.completedPaidEngagements} confirmed payment record${totals.completedPaidEngagements === 1 ? "" : "s"}`, tone: "info" as const } : null,
    (dashboard.data?.payouts ?? []).some((payout) => payout.count > 0) ? { label: "Payout activity", detail: "A payout record exists in the protected finance workflow", tone: "warning" as const } : null,
  ].filter((signal): signal is { label: string; detail: string; tone: "success" | "info" | "warning" } => Boolean(signal));

  return <ApplicationShell role="professional">
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Back to dashboard</Link>
          <PageHeader title="Earnings & Payouts" description="A clear view of verified earnings, protected funds, and payout readiness." />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Financial values below come from your authorized marketplace payment records. Zylobridge does not convert currencies or estimate funds before the underlying release state exists.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end"><Button variant="outline" disabled title="Statement generation is not available yet"><Download className="mr-2 h-4 w-4" />Download statement</Button><Button variant="outline" asChild><Link href="/applications"><BriefcaseBusiness className="mr-2 h-4 w-4" />Applications</Link></Button></div>
      </div>

      {dashboard.isLoading ? <LoadingCards /> : dashboard.isError ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6"><div className="flex items-start gap-3"><XCircle className="mt-0.5 h-5 w-5 text-rose-300" /><div><h2 className="font-semibold">We couldn't load your earnings right now.</h2><p className="mt-2 text-sm text-muted-foreground">Your financial data remains protected. Try again without exposing database or payment details.</p><Button className="mt-4" variant="outline" onClick={() => dashboard.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div></div></div> : <>
        {currencies.length === 0 ? <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6"><div className="flex items-start gap-4"><BarChart3 className="mt-1 h-6 w-6 shrink-0 text-primary" /><div><h2 className="text-xl font-semibold">Your earnings journey starts here</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Complete your first engagement to start earning on Zylobridge. Once payment activity exists, verified balances and transaction history will appear here.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/jobs"><Button>Browse jobs <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Button variant="outline" disabled title="Add a verified payout method through the supported finance flow"><Landmark className="mr-2 h-4 w-4" />Set up payout method</Button></div></div></div></section> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total earnings" value={currencySummary} detail={totals ? `${totals.completedPaidEngagements} confirmed payment record${totals.completedPaidEngagements === 1 ? "" : "s"}` : "Balances are shown separately by currency."} icon={WalletCards} tone="success" /><MetricCard label="Available to withdraw" value={availableSummary} detail={dashboard.data?.payoutReady ? "Eligible funds only; payout initiation is controlled by the authorized finance workflow." : "Set up and verify a payout method before funds can become eligible."} icon={CheckCircle2} tone="success" /><MetricCard label="Pending earnings" value={pendingSummary} detail="Payment activity awaiting confirmation or release. It is not available to withdraw." icon={Clock3} tone="warning" /><MetricCard label="Protected escrow" value={escrowSummary} detail={totals && totals.protectedEngagementCount > 0 ? `${totals.protectedEngagementCount} funded milestone${totals.protectedEngagementCount === 1 ? "" : "s"} still protected` : "No funded milestone is currently linked to your account."} icon={ShieldCheck} /></div>}

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Earnings trend</p><h2 className="mt-2 text-xl font-semibold">Monthly performance</h2></div>{totals?.monthGrowthPercent !== null && totals?.monthGrowthPercent !== undefined && <span className={`text-sm font-semibold ${totals.monthGrowthPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{totals.monthGrowthPercent >= 0 ? "+" : ""}{totals.monthGrowthPercent.toFixed(1)}% vs previous month</span>}</div>{monthBars ? <div className="mt-7"><div className="flex h-44 items-end gap-8 border-b border-border px-4"><div className="flex flex-1 flex-col items-center gap-3"><div className="w-full max-w-28 rounded-t-xl bg-muted" style={{ height: `${monthBars.previous}%` }} aria-label={`Previous month ${formatMinor(totals?.previousMonthEarningsMinor ?? 0, totals?.currency ?? "NGN")}`} /><span className="text-xs text-muted-foreground">Previous month</span></div><div className="flex flex-1 flex-col items-center gap-3"><div className="w-full max-w-28 rounded-t-xl bg-primary" style={{ height: `${monthBars.current}%` }} aria-label={`Current month ${formatMinor(totals?.currentMonthEarningsMinor ?? 0, totals?.currency ?? "NGN")}`} /><span className="text-xs text-muted-foreground">Current month</span></div></div><p className="mt-4 text-sm text-muted-foreground">{formatMinor(totals?.currentMonthEarningsMinor ?? 0, totals?.currency ?? "NGN")} earned this month. Values are based on confirmed marketplace payment records.</p></div> : <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-center"><p className="font-medium">More earnings activity is needed to generate meaningful insights.</p><p className="mt-2 text-sm text-muted-foreground">Monthly comparisons will appear after confirmed payment history exists.</p></div>}</section>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5"><Landmark className="h-5 w-5 text-primary" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payout readiness</p><h2 className="mt-1 text-xl font-semibold">{dashboard.data?.payoutReady ? "Ready for eligibility" : "Setup required"}</h2></div></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{dashboard.data?.payoutReady ? "Your verified payout destination is on file. Actual payout initiation remains subject to the authorized release workflow." : "Complete payout setup so you are ready when your first payment becomes eligible."}</p>{dashboard.data?.payoutMethod ? <div className="mt-5 rounded-xl border border-border bg-background/50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{dashboard.data.payoutMethod.bankName}</p><p className="mt-1 text-sm text-muted-foreground">{dashboard.data.payoutMethod.maskedAccount}</p></div><StatusBadge status={dashboard.data.payoutMethod.isVerified ? "success" : "warning"} label={dashboard.data.payoutMethod.isVerified ? "Verified" : "Pending"} /></div></div> : <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No payout method is connected to this account.</div>}<Button className="mt-5 w-full" variant="outline" disabled title="Self-serve payout settings are not available in the current backend"><Landmark className="mr-2 h-4 w-4" />Manage payout settings</Button></section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payment pipeline</p><h2 className="mt-2 text-xl font-semibold">Where your money is</h2></div><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>{lifecycleSignals.length ? <div className="mt-6 grid gap-3 sm:grid-cols-3">{lifecycleSignals.map((signal) => <div key={signal.label} className="rounded-xl border border-border bg-background/40 p-4"><StatusBadge status={signal.tone} label={signal.label} /><p className="mt-3 text-xs leading-5 text-muted-foreground">{signal.detail}</p></div>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center"><p className="font-medium">No active payment lifecycle recorded</p><p className="mt-2 text-sm text-muted-foreground">Funded escrow, confirmed earnings, and payout stages will appear when they exist in your account.</p></div>}<p className="mt-5 text-sm leading-6 text-muted-foreground">The pipeline is informational. Only stages present in your payment records are shown in transaction and escrow sections below.</p></section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Payment security</h2></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Zylobridge uses protected payment workflows designed to safeguard employer-funded engagements and provide transparent payment status throughout the engagement lifecycle.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-3 font-medium">Protected payments</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Escrow and release state remain server-authoritative.</p></div><div className="rounded-xl border border-border p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 font-medium">Transparent history</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Confirmed records retain references and fee breakdowns.</p></div></div><Link href="/notifications" className="mt-5 inline-flex text-sm font-medium text-primary hover:underline">Open notifications <ArrowRight className="ml-1 h-4 w-4" /></Link></section></div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Transaction ledger</p><h2 className="mt-2 text-xl font-semibold">Your payment activity</h2><p className="mt-2 text-sm text-muted-foreground">Search and filter only the transaction records associated with your professional account.</p></div><div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4"><div className="relative sm:col-span-2 lg:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setTransactionPage(0); }} placeholder="Search reference or job" className="pl-9" aria-label="Search transactions" /></div><select value={status} onChange={(event) => { setStatus(event.target.value); setTransactionPage(0); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" aria-label="Filter transactions by status"><option value="all">All statuses</option><option value="funded">Funded</option><option value="payment_confirmed">Confirmed</option><option value="payment_pending">Pending</option><option value="failed">Failed</option></select><Input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setTransactionPage(0); }} aria-label="Transactions from date" title="From date" /><Input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setTransactionPage(0); }} aria-label="Transactions to date" title="To date" /></div></div>{transactions.isLoading ? <div className="mt-6 h-48 animate-pulse rounded-xl bg-background/60" /> : transactions.isError ? <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5"><p className="font-medium">Transactions are temporarily unavailable.</p><Button className="mt-4" variant="outline" onClick={() => transactions.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div> : transactions.data?.items.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center"><FileText className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-medium">No transactions yet</p><p className="mt-2 text-sm text-muted-foreground">Your completed earnings and payout activity will appear here.</p></div> : <><div className="mt-6 space-y-3">{transactions.data?.items.map((transaction) => <article key={transaction.id} className="grid gap-3 rounded-xl border border-border bg-background/30 p-4 md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] md:items-center"><div><p className="font-medium">{transaction.jobTitle ?? "Marketplace payment"}</p><p className="mt-1 text-xs text-muted-foreground">{transaction.employerName ?? "Employer"} · {transaction.reference}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p></div><div><p className="text-xs text-muted-foreground">Gross</p><p className="mt-1 font-semibold">{formatMinor(transaction.amountMinor, transaction.currency)}</p></div><div><p className="text-xs text-muted-foreground">Zylobridge fee</p><p className="mt-1 text-sm text-muted-foreground">{formatMinor(transaction.platformFeeMinor, transaction.currency)}</p></div><div><p className="text-xs text-muted-foreground">Net earnings</p><p className="mt-1 font-semibold">{formatMinor(transaction.amountMinor - transaction.platformFeeMinor, transaction.currency)}</p></div><div className="md:text-right"><StatusBadge status={statusTone(transaction.status)} label={humanStatus(transaction.status)} /></div></article>)}</div><div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Showing {transactionTotal === 0 ? 0 : transactionPage * pageSize + 1}–{Math.min((transactionPage + 1) * pageSize, transactionTotal)} of {transactionTotal} transactions</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={transactionPage === 0} onClick={() => setTransactionPage((page) => Math.max(0, page - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" size="sm" disabled={transactionPage >= maxPage} onClick={() => setTransactionPage((page) => Math.min(maxPage, page + 1))}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></>}</section>

        <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Protected escrow</p><h2 className="mt-2 text-xl font-semibold">Funds held for active work</h2></div><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>{protectedEscrow.isLoading ? <div className="mt-5 h-28 animate-pulse rounded-xl bg-background/60" /> : protectedEscrow.data?.length ? <div className="mt-5 space-y-3">{protectedEscrow.data.map((item) => <div key={item.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.jobTitle ?? item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.employerName ?? "Employer"} · Due {formatDate(item.dueDate)}</p></div><p className="font-semibold">{formatMinor(item.amountMinor, item.currency)}</p></div><div className="mt-3 flex items-center justify-between"><StatusBadge status="success" label="Funded" /><Link href={`/applications?engagementId=${item.engagementId}`} className="text-sm font-medium text-primary hover:underline">View engagement</Link></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center"><p className="font-medium">No pending protected escrow</p><p className="mt-2 text-sm text-muted-foreground">Funded milestones linked to your active engagements will appear here.</p></div>}</section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payout history</p><h2 className="mt-2 text-xl font-semibold">Transfers and payout status</h2></div><Landmark className="h-5 w-5 text-primary" /></div>{payouts.isLoading ? <div className="mt-5 h-28 animate-pulse rounded-xl bg-background/60" /> : payouts.data?.length ? <div className="mt-5 space-y-3">{payouts.data.map((payout) => <div key={payout.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{payout.jobTitle ?? "Engagement payout"}</p><p className="mt-1 text-xs text-muted-foreground">{payout.reference} · {formatDate(payout.createdAt)}</p></div><p className="font-semibold">{formatMinor(payout.netAmountMinor, payout.currency)}</p></div><div className="mt-3 flex items-center justify-between"><StatusBadge status={statusTone(payout.status)} label={humanStatus(payout.status)} /><span className="text-xs text-muted-foreground">Net after stored platform fee</span></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center"><p className="font-medium">No payout history yet</p><p className="mt-2 text-sm text-muted-foreground">Completed and processing payouts will appear here when supported by the finance workflow.</p></div>}</section></div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Withdraw funds</h2></div><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Self-serve withdrawal is not enabled in the current backend. When a payout is authorized, the existing protected finance workflow validates eligibility, verified payout details, disputes, and transfer state before processing.</p><div className="mt-5 flex flex-wrap gap-3"><Button disabled title="Withdrawal initiation is administrator-authorized in the current backend"><WalletCards className="mr-2 h-4 w-4" />Withdraw funds</Button><Link href="/notifications"><Button variant="outline">Review notifications <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></section>
      </>}
    </div>
  </ApplicationShell>;
}

export default function Payments() {
  const { isAuthenticated } = useAuth();
  const { user } = useAuth();
  const canFund = user?.userType === "client" || user?.userType === "enterprise" || user?.role === "admin" || user?.role === "SUPER_ADMIN";
  const { data: jobs = [], isLoading } = trpc.jobs.myJobs.useQuery(undefined, { enabled: isAuthenticated && canFund });

  if (!isAuthenticated) return <ApplicationShell><EmptyState icon={LockKeyhole} title="Sign in to access payments" description="Funding and payout controls are protected by your account permissions." action={<Link href="/sign-in"><Button>Sign in</Button></Link>} /></ApplicationShell>;
  if (!canFund) return <ProfessionalPayments />;

  return <ApplicationShell role={user?.userType === "enterprise" ? "enterprise" : "employer"}><PageHeader title="Escrow & Funding" description="Open the existing employer workflow to review candidates and fund an accepted engagement securely." action={<Link href="/employer"><Button variant="outline">Employer dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>} /><div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><h2 className="font-semibold text-foreground">Funding stays inside the authorized job flow</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Select an employer job below or open the dashboard. Existing candidate acceptance and escrow controls validate ownership server-side before any payment initialization.</p></div></div></div>{isLoading ? <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading managed jobs…</div> : jobs.length === 0 ? <EmptyState icon={BriefcaseBusiness} title="No managed jobs yet" description="Create or manage a job before funding an accepted application." action={<Link href="/employer/jobs"><Button>View job postings <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>} /> : <div className="grid gap-4 lg:grid-cols-2">{jobs.map((job) => <article key={job.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-foreground">{job.title}</h2><p className="mt-1 text-sm text-muted-foreground">{job.location} · {formatJobBudget(job.budget, job.currency)}</p></div><StatusBadge status={job.status === "completed" ? "success" : job.status === "cancelled" ? "error" : job.status === "in_progress" ? "info" : "warning"} label={job.status.replace("_", " ")} /></div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Candidate review and the existing Fund Escrow action are available from this job’s management view.</p><Link href={`/employer/jobs?jobId=${job.id}`} className="mt-5 inline-flex"><Button variant="outline" size="sm">Manage job <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></article>)}</div>}</ApplicationShell>;
}
