import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid2X2,
  List,
  Loader2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ApplicationShell, EmptyState, StatusBadge } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { formatJobBudget } from "@shared/currency";
import { toast } from "sonner";

type PortfolioStatus = "all" | "open" | "hiring" | "attention" | "in_progress" | "completed" | "cancelled";
type CandidateActivity = "all" | "awaiting_review" | "has_applicants" | "no_applicants" | "shortlisted" | "hired";
type Priority = "all" | "urgent" | "standard";
type SortValue = "recent" | "newest" | "oldest" | "applicants" | "budget_desc" | "budget_asc";
type ViewMode = "cards" | "list";

const statusValues: PortfolioStatus[] = ["all", "open", "hiring", "attention", "in_progress", "completed", "cancelled"];
const candidateValues: CandidateActivity[] = ["all", "awaiting_review", "has_applicants", "no_applicants", "shortlisted", "hired"];
const priorityValues: Priority[] = ["all", "urgent", "standard"];
const sortValues: SortValue[] = ["recent", "newest", "oldest", "applicants", "budget_desc", "budget_asc"];
const pageSize = 20;

function initialState() {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const status = params.get("status") as PortfolioStatus;
  const candidateActivity = params.get("candidates") as CandidateActivity;
  const priority = params.get("priority") as Priority;
  const sort = params.get("sort") as SortValue;
  const urlView = params.get("view") as ViewMode;
  const savedView = typeof window !== "undefined" ? window.localStorage.getItem("zylobridge:employer-jobs-view") as ViewMode | null : null;
  return {
    search: (params.get("search") ?? params.get("jobId") ?? "").slice(0, 120),
    status: statusValues.includes(status) ? status : "all" as PortfolioStatus,
    vocation: (params.get("vocation") ?? "all").slice(0, 64),
    location: (params.get("location") ?? "all").slice(0, 255),
    priority: priorityValues.includes(priority) ? priority : "all" as Priority,
    candidateActivity: candidateValues.includes(candidateActivity) ? candidateActivity : "all" as CandidateActivity,
    sort: sortValues.includes(sort) ? sort : "recent" as SortValue,
    view: urlView === "cards" || urlView === "list" ? urlView : savedView === "cards" || savedView === "list" ? savedView : "cards" as ViewMode,
  };
}

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [delay, value]);
  return debounced;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function relativeDate(value: Date | string) {
  const date = new Date(value);
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

function statusMeta(status: string) {
  if (status === "in_progress") return { label: "In progress", tone: "info" as const };
  if (status === "completed") return { label: "Completed", tone: "success" as const };
  if (status === "cancelled") return { label: "Closed", tone: "neutral" as const };
  return { label: "Open", tone: "success" as const };
}

function Skeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading job postings">
    <div className="h-36 animate-pulse rounded-3xl border border-border bg-card/70" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card/70" />)}</div>
    <div className="h-28 animate-pulse rounded-3xl border border-border bg-card/70" />
    <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-3xl border border-border bg-card/70" />)}</div>
  </div>;
}

function SummaryCard({ label, value, detail, icon: Icon, active, onClick }: { label: string; value: number; detail: string; icon: typeof BriefcaseBusiness; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-2xl border p-4 text-left transition duration-150 active:scale-[.98] ${active ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_rgba(139,92,246,.12)]" : "border-border bg-card hover:border-primary/30"}`}>
    <div className="flex items-start justify-between gap-3"><Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} /><span className="text-2xl font-semibold tracking-tight">{value}</span></div>
    <p className="mt-4 font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
  </button>;
}

export default function EmployerJobs() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const initial = useMemo(initialState, []);
  const [search, setSearch] = useState(initial.search);
  const [status, setStatus] = useState<PortfolioStatus>(initial.status);
  const [vocation, setVocation] = useState(initial.vocation);
  const [location, setLocation] = useState(initial.location);
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [candidateActivity, setCandidateActivity] = useState<CandidateActivity>(initial.candidateActivity);
  const [sort, setSort] = useState<SortValue>(initial.sort);
  const [view, setView] = useState<ViewMode>(initial.view);
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState<{ id: number; title: string; from: string; to: "open" | "completed" | "cancelled" } | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const hiringAccount = Boolean(user && (user.userType === "client" || user.userType === "enterprise" || user.role === "admin" || user.role === "SUPER_ADMIN"));
  const utils = trpc.useUtils();
  const query = trpc.employerJobsPortfolio.useQuery({
    q: debouncedSearch.trim() || undefined,
    status,
    vocation: vocation === "all" ? undefined : vocation,
    location: location === "all" ? undefined : location,
    priority,
    candidateActivity,
    sort,
    limit: pageSize,
    offset,
  }, { enabled: hiringAccount, staleTime: 20_000, retry: 1 });
  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Job status updated.");
      setTransition(null);
      void Promise.all([utils.employerJobsPortfolio.invalidate(), utils.jobs.myJobs.invalidate(), utils.employerDashboard.invalidate()]);
    },
    onError: (error) => toast.error(error.message || "We couldn't update this job."),
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (vocation !== "all") params.set("vocation", vocation);
    if (location !== "all") params.set("location", location);
    if (priority !== "all") params.set("priority", priority);
    if (candidateActivity !== "all") params.set("candidates", candidateActivity);
    if (sort !== "recent") params.set("sort", sort);
    if (view !== "cards") params.set("view", view);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
  }, [candidateActivity, location, priority, search, sort, status, view, vocation]);

  useEffect(() => { setOffset(0); }, [debouncedSearch, status, vocation, location, priority, candidateActivity, sort]);
  useEffect(() => { window.localStorage.setItem("zylobridge:employer-jobs-view", view); }, [view]);

  const clearFilters = () => { setSearch(""); setStatus("all"); setVocation("all"); setLocation("all"); setPriority("all"); setCandidateActivity("all"); setSort("recent"); setOffset(0); };
  const shareJob = async (job: { id: number; title: string }) => {
    const url = `${window.location.origin}/jobs/${job.id}`;
    try {
      if (navigator.share) await navigator.share({ title: job.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Job link copied."); }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("We couldn't share this job.");
    }
  };

  if (authLoading || !user) return <ApplicationShell role="employer"><Skeleton /></ApplicationShell>;
  if (!hiringAccount) return <ApplicationShell><EmptyState icon={BriefcaseBusiness} title="Employer workspace required" description="My Job Postings is available to contractor, client, and authorized enterprise accounts." action={<Link href="/jobs"><Button variant="outline">Browse jobs</Button></Link>} /></ApplicationShell>;

  const data = query.data;
  const summary = data?.summary;
  const jobs = data?.items ?? [];
  const attention = data?.attention ?? [];
  const vocations = data?.vocations ?? [];
  const locations = data?.locations ?? [];
  const insight = summary?.fundingRequired
    ? `${summary.fundingRequired} hired professional${summary.fundingRequired === 1 ? " is" : "s are"} waiting for escrow funding.`
    : summary?.awaitingReview
      ? `${summary.awaitingReview} application${summary.awaitingReview === 1 ? " is" : "s are"} waiting for review.`
      : summary?.needsAttention
        ? `${summary.needsAttention} job${summary.needsAttention === 1 ? " needs" : "s need"} attention.`
        : "Your hiring portfolio has no outstanding action items.";
  const tabs: Array<{ value: PortfolioStatus; label: string; count: number }> = [
    { value: "all", label: "All Jobs", count: summary?.total ?? 0 },
    { value: "open", label: "Open", count: summary?.open ?? 0 },
    { value: "hiring", label: "Hiring", count: summary?.hiring ?? 0 },
    { value: "in_progress", label: "In Progress", count: summary?.inProgress ?? 0 },
    { value: "completed", label: "Completed", count: summary?.completed ?? 0 },
    { value: "cancelled", label: "Closed", count: summary?.closed ?? 0 },
  ];

  return <ApplicationShell role={user.userType === "enterprise" ? "enterprise" : "employer"}>
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-950/60 via-card to-cyan-950/30 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Job lifecycle command center</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">My Job Postings</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Manage every opportunity, candidate, and hiring decision from one place.</p><div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs text-gray-300"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />{query.isLoading ? "Reviewing your portfolio…" : insight}</div></div>
          <Link href="/jobs/new"><Button size="lg" className="w-full bg-violet-600 hover:bg-violet-500 md:w-auto"><Plus className="mr-2 h-5 w-5" />Post a Job</Button></Link>
        </div>
      </header>

      {query.isLoading ? <Skeleton /> : query.isError || !data ? <EmptyState icon={AlertTriangle} title="We couldn't load your job postings" description="Please try again. Your job information could not be retrieved right now." action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => void query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button><Link href="/employer"><Button variant="outline">Go to Dashboard</Button></Link></div>} /> : !summary?.total ? <EmptyState icon={BriefcaseBusiness} title="Build your team with Zylobridge" description="Post your first opportunity and connect with skilled professionals ready to work." action={<div className="flex flex-wrap justify-center gap-3"><Link href="/jobs/new"><Button><Plus className="mr-2 h-4 w-4" />Post Your First Job</Button></Link><Link href="/talent"><Button variant="outline">Find Talent Instead</Button></Link></div>} /> : <>
        <section aria-label="Job portfolio summary" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <SummaryCard label="Total Jobs" value={summary.total} detail="Every job in your authorized portfolio" icon={BriefcaseBusiness} active={status === "all"} onClick={() => setStatus("all")} />
          <SummaryCard label="Open Jobs" value={summary.open} detail="Currently accepting applications" icon={UsersRound} active={status === "open"} onClick={() => setStatus("open")} />
          <SummaryCard label="Needs Attention" value={summary.needsAttention} detail="Funding, reviews, or stale postings" icon={AlertTriangle} active={status === "attention"} onClick={() => setStatus("attention")} />
          <SummaryCard label="In Progress" value={summary.inProgress} detail="Hired professionals and active work" icon={Clock3} active={status === "in_progress"} onClick={() => setStatus("in_progress")} />
          <SummaryCard label="Completed" value={summary.completed} detail="Finished jobs retained for history" icon={CheckCircle2} active={status === "completed"} onClick={() => setStatus("completed")} />
        </section>

        {attention.length > 0 && <section aria-labelledby="attention-title" className="rounded-3xl border border-amber-400/20 bg-amber-400/[.04] p-5 sm:p-6">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-400/10 p-2.5"><AlertTriangle className="h-5 w-5 text-amber-300" /></div><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-300">Priority queue</p><h2 id="attention-title" className="mt-1 text-xl font-semibold">Needs Your Attention</h2><p className="mt-1 text-sm text-muted-foreground">Only jobs with a meaningful next action appear here.</p></div></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">{attention.map((job) => <article key={job.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{job.title}</p><StatusBadge status={statusMeta(job.status).tone} label={statusMeta(job.status).label} /></div><p className="mt-2 text-sm text-muted-foreground">{job.attention?.reason}</p></div><Link href={job.attention?.href ?? `/jobs/${job.id}`}><Button size="sm" className="w-full sm:w-auto">{job.attention?.action}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></article>)}</div>
        </section>}

        <section className="space-y-4">
          <nav aria-label="Job lifecycle" className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <button key={tab.value} type="button" onClick={() => setStatus(tab.value)} aria-pressed={status === tab.value} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${status === tab.value ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{tab.label} ({tab.count})</button>)}</nav>
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(135px,.7fr))_auto]">
              <label className="relative"><span className="sr-only">Search your jobs</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your jobs..." className="pl-9" /></label>
              <select value={vocation} onChange={(event) => setVocation(event.target.value)} aria-label="Filter by vocation" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All vocations</option>{vocations.map((item) => <option key={item} value={item}>{VOCATION_LABELS[item as VocationKey] ?? item}</option>)}</select>
              <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All locations</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} aria-label="Filter by priority" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="standard">Standard</option></select>
              <select value={candidateActivity} onChange={(event) => setCandidateActivity(event.target.value as CandidateActivity)} aria-label="Filter by candidate activity" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All candidate activity</option><option value="awaiting_review">Awaiting review</option><option value="has_applicants">Has applicants</option><option value="no_applicants">No applicants</option><option value="shortlisted">Shortlisted</option><option value="hired">Hired</option></select>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="text-sm text-muted-foreground">Showing {jobs.length ? offset + 1 : 0}–{offset + jobs.length} of {data?.total ?? 0} jobs</p><div className="flex flex-wrap items-center gap-2"><select value={sort} onChange={(event) => setSort(event.target.value as SortValue)} aria-label="Sort jobs" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="recent">Recently updated</option><option value="newest">Newest posted</option><option value="oldest">Oldest posted</option><option value="applicants">Most applicants</option><option value="budget_desc">Highest budget</option><option value="budget_asc">Lowest budget</option></select><div className="flex rounded-lg border border-border p-1"><button type="button" onClick={() => setView("cards")} aria-label="Card view" aria-pressed={view === "cards"} className={`rounded-md p-1.5 ${view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Grid2X2 className="h-4 w-4" /></button><button type="button" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} className={`rounded-md p-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button></div></div></div>
          </div>
        </section>

        {jobs.length === 0 ? <EmptyState icon={Search} title={status === "completed" ? "No completed jobs yet" : "No jobs match your filters"} description={status === "completed" ? "Completed jobs will remain available here for your records." : "Try adjusting your filters or clearing your search."} action={<div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={clearFilters}>Clear Filters</Button><Link href="/jobs/new"><Button>Post a Job</Button></Link></div>} /> : <section aria-label="Job portfolio" className={view === "cards" ? "grid gap-4 2xl:grid-cols-2" : "space-y-3"}>
          {jobs.map((job) => {
            const meta = statusMeta(job.status);
            const escrowLabel = !job.escrow ? null : job.escrow.status === "pending" ? "Funding required" : job.escrow.status === "funded" ? "Funded" : job.escrow.status === "released" ? "Payment released" : job.escrow.status.replaceAll("_", " ");
            return <article key={job.id} className="rounded-3xl border border-border bg-card p-5 transition hover:border-primary/25 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={meta.tone} label={meta.label} />{job.isUrgent && <StatusBadge status="warning" label="Urgent" />}<span className="text-xs text-muted-foreground">Job #{job.id}</span></div><h2 className="mt-3 text-xl font-semibold tracking-tight">{job.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"><span>{VOCATION_LABELS[job.vocation as VocationKey] ?? job.vocation}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span><span className="inline-flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />{formatJobBudget(job.budget, job.currency)}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Posted {formatDate(job.createdAt)}</span><span>{relativeDate(job.updatedAt)}</span>{job.deadline && <span>Deadline {formatDate(job.deadline)}</span>}</div></div>
                <div className="flex shrink-0 items-center gap-2"><Link href={job.primaryAction.href}><Button className="min-w-36">{job.primaryAction.label}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={`More actions for ${job.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem asChild><Link href={`/jobs/${job.id}`}>View Job</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => void shareJob(job)}><Share2 className="mr-2 h-4 w-4" />Share Job</DropdownMenuItem><DropdownMenuSeparator />{job.status === "open" && <DropdownMenuItem onSelect={() => setTransition({ id: job.id, title: job.title, from: job.status, to: "cancelled" })}>Close Posting</DropdownMenuItem>}{job.status === "cancelled" && <DropdownMenuItem onSelect={() => setTransition({ id: job.id, title: job.title, from: job.status, to: "open" })}>Reopen Posting</DropdownMenuItem>}{job.status === "in_progress" && <DropdownMenuItem onSelect={() => setTransition({ id: job.id, title: job.title, from: job.status, to: "completed" })}>Mark Complete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>
              </div>

              <div className="mt-5 grid gap-3 border-y border-border py-4 sm:grid-cols-4">
                <Link href={`/employer/jobs/${job.id}/candidates`} className="rounded-xl p-2 transition hover:bg-muted"><p className="text-xs text-muted-foreground">Applied</p><p className="mt-1 font-semibold">{job.applicationCount}</p></Link>
                <Link href={`/employer/jobs/${job.id}/candidates`} className="rounded-xl p-2 transition hover:bg-muted"><p className="text-xs text-muted-foreground">Awaiting review</p><p className="mt-1 font-semibold">{job.awaitingReviewCount}</p></Link>
                <Link href={`/employer/jobs/${job.id}/candidates`} className="rounded-xl p-2 transition hover:bg-muted"><p className="text-xs text-muted-foreground">Shortlisted</p><p className="mt-1 font-semibold">{job.shortlistCount}</p></Link>
                <Link href={`/employer/jobs/${job.id}/candidates`} className="rounded-xl p-2 transition hover:bg-muted"><p className="text-xs text-muted-foreground">Interview / hired</p><p className="mt-1 font-semibold">{job.interviewCount} / {job.hiredCount}</p></Link>
              </div>

              {(job.engagement || job.escrow || job.hiredProfessional) && <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-xs text-muted-foreground">Professional</p><p className="mt-1 truncate text-sm font-medium">{job.hiredProfessional?.name || (job.hiredCount ? "Hired professional" : "Not hired")}</p>{job.hiredProfessional?.isVerified && <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400"><ShieldCheck className="h-3 w-3" />Verified account</p>}</div><div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-xs text-muted-foreground">Work status</p><p className="mt-1 text-sm font-medium capitalize">{job.engagement?.status ?? (job.isInProgress ? "active" : "Not started")}</p>{job.engagement?.startDate && <p className="mt-1 text-xs text-muted-foreground">Started {formatDate(job.engagement.startDate)}</p>}</div><div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-xs text-muted-foreground">Escrow</p><p className="mt-1 text-sm font-medium capitalize">{escrowLabel ?? "No escrow record"}</p>{job.escrow && <p className="mt-1 text-xs text-muted-foreground">{formatJobBudget(job.escrow.amount, job.escrow.currency)}</p>}</div></div>}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">{job.attention?.reason ?? (job.status === "open" ? `${job.applicationCount} application${job.applicationCount === 1 ? "" : "s"} received over ${job.ageDays} day${job.ageDays === 1 ? "" : "s"}.` : "This job remains available in your portfolio history.")}</p><div className="flex flex-wrap gap-2"><Link href={`/jobs/${job.id}`}><Button size="sm" variant="ghost">View Job</Button></Link>{job.conversationId && <Link href={`/messages/${job.conversationId}`}><Button size="sm" variant="outline"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Message</Button></Link>}{(job.engagement || job.escrow) && <Link href={`/payments?jobId=${job.id}`}><Button size="sm" variant="outline"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Manage Escrow</Button></Link>}</div></div>
            </article>;
          })}
        </section>}

        <div className="flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Showing {jobs.length ? offset + 1 : 0}–{offset + jobs.length} of {data?.total ?? 0} filtered jobs</span><div className="flex gap-2"><Button variant="outline" disabled={offset === 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - pageSize))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" disabled={!data?.hasMore || query.isFetching} onClick={() => setOffset(data?.nextOffset ?? offset + pageSize)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
      </>}
    </div>

    <AlertDialog open={Boolean(transition)} onOpenChange={(open) => !open && setTransition(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{transition?.to === "completed" ? "Complete this job?" : transition?.to === "cancelled" ? "Close this posting?" : "Reopen this posting?"}</AlertDialogTitle><AlertDialogDescription>{transition?.to === "completed" ? "This records the job as completed. Confirm that the work lifecycle and payment obligations are ready before continuing; escrow release remains controlled by the existing payment workflow." : transition?.to === "cancelled" ? `“${transition?.title}” will stop accepting public applications but remain in your portfolio history.` : `“${transition?.title}” will return to the open marketplace and accept applications again.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={updateStatus.isPending} onClick={(event) => { event.preventDefault(); if (transition) updateStatus.mutate({ id: transition.id, status: transition.to }); }}>{updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : transition?.to === "completed" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}{transition?.to === "completed" ? "Mark Completed" : transition?.to === "cancelled" ? "Close Posting" : "Reopen Posting"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </ApplicationShell>;
}
