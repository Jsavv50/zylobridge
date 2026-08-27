import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { BriefcaseBusiness, Building2, CalendarDays, Check, ChevronRight, Clock3, DollarSign, ExternalLink, Filter, MessageCircle, Search, ShieldCheck, Star, WalletCards, X, XCircle } from "lucide-react";
import { trpc } from "../lib/trpc";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "../components/shell/ZyloShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { formatJobBudget } from "@shared/currency";
import { APPLICATION_STAGE_LABELS, APPLICATION_STAGE_ORDER, applicationStageMessage, type ApplicationStage } from "@shared/applicationLifecycle";
import { VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { toast } from "sonner";

type ApplicationItem = {
  id: number;
  jobId: number;
  coverLetter: string;
  bidAmount: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: Date | string;
  updatedAt: Date | string;
  employerName: string;
  employerId?: number | null;
  employerVerified: boolean;
  stage: ApplicationStage;
  job: { id: number; title: string; description: string; vocation: string; location: string; budget: string; currency?: string | null; status: string; deadline?: Date | string | null };
  escrow?: { status: string } | null;
  engagement?: { status: string } | null;
  interview?: { status: string; scheduledAt: Date | string } | null;
};

type StatusFilter = "all" | ApplicationStage;
const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" }, { id: "under_review", label: "Under review" }, { id: "shortlisted", label: "Shortlisted" }, { id: "interview", label: "Interview" }, { id: "accepted", label: "Accepted" }, { id: "active", label: "Active" }, { id: "completed", label: "Completed" }, { id: "rejected", label: "Rejected" }, { id: "withdrawn", label: "Withdrawn" },
];

const STAGE_TONE: Record<ApplicationStage, "success" | "info" | "warning" | "error" | "neutral"> = {
  submitted: "info", under_review: "warning", shortlisted: "warning", interview: "info", accepted: "success", active: "success", completed: "success", rejected: "error", withdrawn: "neutral",
};

function ApplicationProgress({ stage }: { stage: ApplicationStage }) {
  const currentIndex = APPLICATION_STAGE_ORDER.indexOf(stage);
  return <div className="flex min-w-0 items-center gap-1 overflow-hidden" aria-label={`Application progress: ${APPLICATION_STAGE_LABELS[stage]}`}>
    {APPLICATION_STAGE_ORDER.map((step, index) => <div key={step} className="flex min-w-0 items-center gap-1"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${index <= currentIndex ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}>{index < currentIndex ? <Check className="h-3 w-3" /> : index + 1}</span>{index < APPLICATION_STAGE_ORDER.length - 1 && <span className={`h-px w-4 shrink-0 ${index < currentIndex ? "bg-primary/50" : "bg-border"}`} />}</div>)}
  </div>;
}

function MessageEmployerButton({ application }: { application: ApplicationItem }) {
  const [, navigate] = useLocation();
  const message = trpc.messaging.getOrCreateConversation.useMutation({ onSuccess: (conversation) => navigate(`/messages?conv=${conversation.id}`), onError: () => toast.error("We couldn't open the employer conversation.") });
  if (!application.employerId) return null;
  return <Button variant="outline" size="sm" disabled={message.isPending} onClick={() => message.mutate({ jobId: application.jobId, otherUserId: application.employerId! })}><MessageCircle className="mr-2 h-4 w-4" />Message employer</Button>;
}

function ApplicationCard({ application, onWithdraw }: { application: ApplicationItem; onWithdraw: (application: ApplicationItem) => void }) {
  const [, navigate] = useLocation();
  const isAccepted = ["accepted", "active", "completed"].includes(application.stage);
  const paymentLabel = application.escrow?.status === "funded" ? "Escrow funded" : application.escrow?.status === "released" ? "Payment released" : application.escrow?.status === "pending" ? "Awaiting escrow" : null;
  return <article className={`rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 sm:p-6 ${isAccepted ? "border-emerald-400/30 bg-emerald-500/[0.03]" : "border-border"}`}>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={STAGE_TONE[application.stage]} label={APPLICATION_STAGE_LABELS[application.stage]} />{application.employerVerified && <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />Verified employer</span>}<span className="text-xs text-muted-foreground">Application #{application.id}</span></div>
        <Link href={`/applications/${application.id}`} className="mt-3 block text-xl font-semibold tracking-tight hover:text-primary">{application.job.title}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" />{application.employerName}</span><span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4 text-primary" />{VOCATION_LABELS[application.job.vocation as VocationKey] ?? application.job.vocation}</span><span className="inline-flex items-center gap-1.5"><span className="text-primary">⌖</span>{application.job.location}</span></div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Applied</p><p className="mt-1 inline-flex items-center gap-1.5 font-medium"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{new Date(application.createdAt).toLocaleDateString()}</p></div><div><p className="text-xs text-muted-foreground">Your bid</p><p className="mt-1 inline-flex items-center gap-1.5 font-medium"><DollarSign className="h-3.5 w-3.5 text-emerald-300" />{formatJobBudget(application.bidAmount, application.job.currency)}</p></div><div><p className="text-xs text-muted-foreground">Job budget</p><p className="mt-1 font-medium">{formatJobBudget(application.job.budget, application.job.currency)}</p></div></div>
        <div className="mt-5 rounded-xl border border-border/80 bg-background/50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Application progress</p><span className="text-xs font-medium text-primary">{APPLICATION_STAGE_LABELS[application.stage]}</span></div><div className="mt-3 overflow-x-auto pb-1"><ApplicationProgress stage={application.stage} /></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{applicationStageMessage(application.stage)}</p></div>
        <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cover note</p><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{application.coverLetter}</p></div>
        {isAccepted && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm"><WalletCards className="h-5 w-5 text-emerald-300" /><div><p className="font-semibold text-emerald-200">Engagement pathway</p><p className="mt-1 text-emerald-100/70">{paymentLabel ?? "Payment protection becomes available through the existing engagement flow."}</p></div></div>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 xl:w-44 xl:flex-col xl:items-stretch"><Link href={`/applications/${application.id}`}><Button className="w-full" size="sm">View application<ChevronRight className="ml-2 h-4 w-4" /></Button></Link><Link href={`/jobs/${application.job.id}`}><Button variant="outline" className="w-full" size="sm">View job<ExternalLink className="ml-2 h-3.5 w-3.5" /></Button></Link>{["shortlisted", "interview", "accepted", "active"].includes(application.stage) && <MessageEmployerButton application={application} />}{application.stage === "under_review" && <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => onWithdraw(application)}><XCircle className="mr-2 h-4 w-4" />Withdraw</Button>}{application.stage === "completed" && <Link href={`/jobs/${application.job.id}?review=1`}><Button variant="ghost" size="sm" className="w-full"><Star className="mr-2 h-4 w-4" />Leave review</Button></Link>}</div>
    </div>
  </article>;
}

export default function ProfessionalApplications() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<StatusFilter>(() => {
    if (typeof window === "undefined") return "all";
    const requested = new URLSearchParams(window.location.search).get("status") as StatusFilter | null;
    return requested && STATUS_TABS.some((tab) => tab.id === requested) ? requested : "all";
  });
  const [q, setQ] = useState("");
  const [vocation, setVocation] = useState("all");
  const [location, setLocation] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "updated" | "bid_high" | "bid_low">("recent");
  const [offset, setOffset] = useState(0);
  const [withdrawTarget, setWithdrawTarget] = useState<ApplicationItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("no_longer_available");
  const input = useMemo(() => ({ q: q.trim() || undefined, status, vocation: vocation === "all" ? undefined : vocation, location: location.trim() || undefined, paymentStatus: paymentStatus === "all" ? undefined : paymentStatus, sort, limit: 12, offset }), [q, status, vocation, location, paymentStatus, sort, offset]);
  const query = trpc.applications.commandCenter.useQuery(input);
  const withdraw = trpc.applications.updateStatus.useMutation({ onSuccess: () => { setWithdrawTarget(null); toast.success("Application withdrawn."); void query.refetch(); }, onError: () => toast.error("We couldn't withdraw this application. Please try again.") });
  const data = query.data;
  const counts = data?.counts ?? {};
  const metrics = [{ id: "all" as const, label: "Total applications", value: data?.total ?? 0, icon: BriefcaseBusiness }, { id: "under_review" as const, label: "Awaiting review", value: counts.under_review ?? 0, icon: Clock3 }, { id: "shortlisted" as const, label: "Shortlisted", value: counts.shortlisted ?? 0, icon: ShieldCheck }, { id: "accepted" as const, label: "Accepted", value: counts.accepted ?? 0, icon: Check }, { id: "active" as const, label: "Active jobs", value: counts.active ?? 0, icon: WalletCards }, { id: "rejected" as const, label: "Rejected", value: counts.rejected ?? 0, icon: XCircle }];
  const reset = () => { setQ(""); setVocation("all"); setLocation(""); setPaymentStatus("all"); setStatus("all"); setSort("recent"); setOffset(0); };
  return <ApplicationShell role="professional"><div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><PageHeader title="My Applications" description="Track, manage, and follow every opportunity you've applied for on Zylobridge." /><Button onClick={() => navigate("/jobs")}><Search className="mr-2 h-4 w-4" />Find jobs</Button></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Application overview metrics">{metrics.map(({ id, label, value, icon: Icon }) => <button key={label} type="button" onClick={() => { setStatus(id); setOffset(0); }} className={`rounded-2xl border p-4 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === id ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-3 text-2xl font-semibold">{query.isLoading ? "—" : value}</p></button>)}</section>
    <div className="flex gap-2 overflow-x-auto border-b border-border pb-3" role="tablist" aria-label="Application status"><div className="flex min-w-max gap-2">{STATUS_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={status === tab.id} onClick={() => { setStatus(tab.id); setOffset(0); }} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === tab.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{tab.label}<span className="ml-1.5 text-[11px] opacity-70">{tab.id === "all" ? data?.total ?? 0 : counts[tab.id] ?? 0}</span></button>)}</div></div>
    <section className="rounded-2xl border border-border bg-card p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_170px_auto]"><div><Label htmlFor="applications-search">Search applications</Label><div className="relative mt-1.5"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="applications-search" value={q} onChange={(event) => { setQ(event.target.value); setOffset(0); }} placeholder="Job, employer, vocation or location" className="pl-9" /></div></div><div><Label htmlFor="applications-vocation">Vocation</Label><Select value={vocation} onValueChange={(value) => { setVocation(value); setOffset(0); }}><SelectTrigger id="applications-vocation" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All vocations</SelectItem>{Object.entries(VOCATION_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="applications-location">Location</Label><Input id="applications-location" value={location} onChange={(event) => { setLocation(event.target.value); setOffset(0); }} placeholder="City or region" className="mt-1.5" /></div><div><Label htmlFor="applications-payment">Payment state</Label><Select value={paymentStatus} onValueChange={(value) => { setPaymentStatus(value); setOffset(0); }}><SelectTrigger id="applications-payment" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All payment states</SelectItem><SelectItem value="none">No escrow record</SelectItem><SelectItem value="pending">Awaiting escrow</SelectItem><SelectItem value="funded">Escrow funded</SelectItem><SelectItem value="released">Payment released</SelectItem><SelectItem value="refunded">Refunded</SelectItem><SelectItem value="disputed">Disputed</SelectItem></SelectContent></Select></div><div><Label htmlFor="applications-sort">Sort by</Label><Select value={sort} onValueChange={(value) => { setSort(value as typeof sort); setOffset(0); }}><SelectTrigger id="applications-sort" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Most recent</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="updated">Recently updated</SelectItem><SelectItem value="bid_high">Highest bid</SelectItem><SelectItem value="bid_low">Lowest bid</SelectItem></SelectContent></Select></div><Button variant="outline" className="self-end" onClick={reset}><Filter className="mr-2 h-4 w-4" />Reset</Button></div></section>
    {query.isLoading ? <div className="grid gap-4">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />)}</div> : query.isError ? <EmptyState icon={XCircle} title="We couldn't load your applications" description="Please try again. Your application records are protected and never replaced with placeholder data." action={<Button onClick={() => void query.refetch()}>Retry</Button>} /> : !data?.items.length ? <EmptyState icon={BriefcaseBusiness} title={status === "all" ? "No applications yet" : `No ${APPLICATION_STAGE_LABELS[status]} applications`} description={status === "all" ? "You haven't applied for any jobs yet. Explore available opportunities and find your next project." : "Applications matching this stage will appear here when the employer or engagement workflow updates them."} action={<Button onClick={() => navigate("/jobs")}>Browse jobs</Button>} /> : <div className="grid gap-4">{(data.items as ApplicationItem[]).map((application) => <ApplicationCard key={application.id} application={application} onWithdraw={setWithdrawTarget} />)}</div>}
    {data?.items.length ? <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={offset === 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</Button><span className="text-xs text-muted-foreground">Showing {offset + 1}–{offset + data.items.length} of {data.total}</span><Button variant="outline" disabled={!data.hasMore || query.isFetching} onClick={() => setOffset(data.nextOffset)}>Next</Button></div> : null}
  </div><Dialog open={Boolean(withdrawTarget)} onOpenChange={(open) => !open && setWithdrawTarget(null)}><DialogContent><DialogHeader><DialogTitle>Withdraw application?</DialogTitle><DialogDescription>Are you sure you want to withdraw your application for {withdrawTarget?.job.title}? This preserves the application history and moves it into Withdrawn.</DialogDescription></DialogHeader><div><Label htmlFor="withdraw-reason">Reason (optional)</Label><Select value={withdrawReason} onValueChange={setWithdrawReason}><SelectTrigger id="withdraw-reason" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="found_another_opportunity">Found another opportunity</SelectItem><SelectItem value="no_longer_available">No longer available</SelectItem><SelectItem value="requirements_changed">Job requirements changed</SelectItem><SelectItem value="no_response">Employer hasn't responded</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setWithdrawTarget(null)}>Cancel</Button><Button variant="destructive" disabled={withdraw.isPending} onClick={() => withdrawTarget && withdraw.mutate({ id: withdrawTarget.id, status: "withdrawn" })}><X className="mr-2 h-4 w-4" />Withdraw application</Button></DialogFooter></DialogContent></Dialog></ApplicationShell>;
}
