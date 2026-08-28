import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Bell, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, X, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JobCard from "@/components/JobCard";
import { ApplicationShell, EmptyState } from "@/components/shell/ZyloShell";
import { VOCATION_CATEGORIES, VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { toast } from "sonner";
import { isHiringAccount } from "@shared/marketplaceNavigation";

type SortValue = "newest" | "budget_desc" | "deadline";
type ViewValue = "recommended" | "nearby" | "newest" | "urgent" | "highpay" | "remote" | "saved";

const VIEW_OPTIONS: Array<{ value: ViewValue; label: string; icon: typeof Sparkles }> = [
  { value: "recommended", label: "Recommended for you", icon: Sparkles },
  { value: "nearby", label: "Near you", icon: MapPin },
  { value: "newest", label: "New jobs", icon: Clock3 },
  { value: "urgent", label: "Urgent jobs", icon: Zap },
  { value: "highpay", label: "Highest budget", icon: CheckCircle2 },
  { value: "remote", label: "Remote", icon: BriefcaseBusiness },
  { value: "saved", label: "Saved jobs", icon: Bookmark },
];

function readSearchParams(): { q: string; vocation: string; location: string; sort: SortValue; view: ViewValue; minBudget: string; maxBudget: string } {
  if (typeof window === "undefined") return { q: "", vocation: "all", location: "", sort: "newest" as SortValue, view: "recommended" as ViewValue, minBudget: "", maxBudget: "" };
  const params = new URLSearchParams(window.location.search);
  const sort = params.get("sort");
  const view = params.get("view");
  return {
    q: params.get("q") ?? "",
    vocation: params.get("vocation") ?? "all",
    location: params.get("location") ?? "",
    sort: sort === "budget_desc" || sort === "deadline" ? sort : "newest",
    view: VIEW_OPTIONS.some((option) => option.value === view) ? view as ViewValue : "recommended",
    minBudget: params.get("minBudget") ?? "",
    maxBudget: params.get("maxBudget") ?? "",
  };
}

function formatBudget(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : "Budget not specified";
}

export default function JobsMarketplace() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const initial = useMemo(readSearchParams, []);
  const [q, setQ] = useState(initial.q);
  const [vocation, setVocation] = useState(initial.vocation);
  const [location, setLocation] = useState(initial.location);
  const [sort, setSort] = useState<SortValue>(initial.sort);
  const [view, setView] = useState<ViewValue>(initial.view);
  const [minBudget, setMinBudget] = useState(initial.minBudget);
  const [maxBudget, setMaxBudget] = useState(initial.maxBudget);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertName, setAlertName] = useState("");

  const professionalEnabled = isAuthenticated && user?.userType === "professional";
  const hiringAccount = isAuthenticated && isHiringAccount(user);
  useEffect(() => {
    if (!authLoading && hiringAccount) navigate("/talent");
  }, [authLoading, hiringAccount, navigate]);
  const profileQuery = trpc.profiles.me.useQuery(undefined, { enabled: professionalEnabled });
  const savedIdsQuery = trpc.savedJobs.ids.useQuery(undefined, { enabled: professionalEnabled });
  const utils = trpc.useUtils();
  const toggleSaved = trpc.savedJobs.toggle.useMutation({
    onSuccess: (_result, variables) => {
      toast.success(variables.saved ? "Job saved for later." : "Job removed from saved jobs.");
      void utils.savedJobs.ids.invalidate();
      void utils.savedJobs.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "We couldn't update saved jobs."),
  });

  const input = useMemo(() => ({
    q: q.trim() || undefined,
    vocation: vocation === "all" ? undefined : vocation,
    location: location.trim() || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    isUrgent: urgentOnly || view === "urgent" ? true : undefined,
    sort: view === "highpay" ? "budget_desc" as const : sort,
    status: "open" as const,
    limit: 12,
    offset,
  }), [q, vocation, location, minBudget, maxBudget, urgentOnly, view, sort, offset]);
  const jobsQuery = trpc.jobs.search.useQuery(input, { enabled: !hiringAccount && !(professionalEnabled && view === "recommended") });
  const recommendedInput = useMemo(() => {
    const { sort: _sort, status: _status, ...rest } = input;
    return rest;
  }, [input]);
  const recommendationQuery = trpc.jobs.recommended.useQuery(recommendedInput, { enabled: !hiringAccount && professionalEnabled && view === "recommended" });
  const activityQuery = trpc.jobs.activity.useQuery(undefined, { enabled: professionalEnabled });
  const alertsQuery = trpc.jobAlerts.list.useQuery(undefined, { enabled: professionalEnabled });
  const createAlert = trpc.jobAlerts.create.useMutation({ onSuccess: () => { toast.success("Job alert saved."); setAlertName(""); void alertsQuery.refetch(); }, onError: (error) => toast.error(error.message || "We couldn't save this alert.") });
  const toggleAlert = trpc.jobAlerts.toggle.useMutation({ onSuccess: () => void alertsQuery.refetch(), onError: (error) => toast.error(error.message || "We couldn't update this alert.") });
  const deleteAlert = trpc.jobAlerts.delete.useMutation({ onSuccess: () => void alertsQuery.refetch(), onError: (error) => toast.error(error.message || "We couldn't delete this alert.") });
  const browseQuery = professionalEnabled && view === "recommended" ? recommendationQuery : jobsQuery;

  const savedIds = savedIdsQuery.data ?? [];
  const jobs = useMemo(() => {
    const source = browseQuery.data?.items ?? [];
    return [...source]
      .filter((job) => view !== "saved" || savedIds.includes(job.id))
      .filter((job) => view !== "remote" || job.location.toLowerCase().includes("remote"));
  }, [browseQuery.data?.items, savedIds, view]);
  const activity = recommendationQuery.data?.activity ?? activityQuery.data;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "professional";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  const activeFilters = [
    q.trim() ? { label: `Search: ${q.trim()}`, clear: () => setQ("") } : null,
    vocation !== "all" ? { label: VOCATION_LABELS[vocation as VocationKey] ?? vocation, clear: () => setVocation("all") } : null,
    location.trim() ? { label: location.trim(), clear: () => setLocation("") } : null,
    minBudget ? { label: `Min ${formatBudget(minBudget)}`, clear: () => setMinBudget("") } : null,
    maxBudget ? { label: `Max ${formatBudget(maxBudget)}`, clear: () => setMaxBudget("") } : null,
    urgentOnly || view === "urgent" ? { label: "Urgent", clear: () => { setUrgentOnly(false); if (view === "urgent") setView("recommended"); } } : null,
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>;

  const applyFilters = () => {
    setOffset(0);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (vocation !== "all") params.set("vocation", vocation);
    if (location.trim()) params.set("location", location.trim());
    if (sort !== "newest") params.set("sort", sort);
    if (view !== "recommended") params.set("view", view);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    navigate(params.toString() ? `/jobs?${params.toString()}` : "/jobs");
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    setQ(""); setVocation("all"); setLocation(""); setSort("newest"); setView("recommended"); setMinBudget(""); setMaxBudget(""); setUrgentOnly(false); setOffset(0); navigate("/jobs");
  };

  const handleViewChange = (nextView: ViewValue) => {
    if (nextView === "saved" && !professionalEnabled) {
      toast.info("Sign in as a professional to access saved jobs.");
      navigate("/sign-in");
      return;
    }
    setView(nextView);
    setOffset(0);
  };

  const filters = <FilterPanel q={q} setQ={setQ} vocation={vocation} setVocation={setVocation} location={location} setLocation={setLocation} sort={sort} setSort={setSort} minBudget={minBudget} setMinBudget={setMinBudget} maxBudget={maxBudget} setMaxBudget={setMaxBudget} urgentOnly={urgentOnly} setUrgentOnly={setUrgentOnly} onApply={applyFilters} onReset={resetFilters} />;

  if (authLoading || hiringAccount) return <div className="min-h-screen bg-background text-foreground"><ApplicationShell><div className="h-40 animate-pulse rounded-3xl bg-muted/50" /><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-muted/50" /><div className="h-64 animate-pulse rounded-2xl bg-muted/50" /></div></ApplicationShell></div>;

  return (
    <ApplicationShell>
      <div className="mb-4"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link></div>
      <header className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/60 via-[#111827] to-cyan-950/40 p-6 sm:p-8 lg:p-10">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative max-w-4xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Professional marketplace</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{professionalEnabled ? `${greeting}, ${firstName}` : "Find your next opportunity"}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">{professionalEnabled ? "Your marketplace view is ranked from your vocation, skills, location, and live application activity." : "Discover verified jobs and projects matched to your skills, experience, vocation, and location."}</p><div className="mt-7 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><Input aria-label="What work are you looking for?" value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="Search vocation, skill, job title or keyword" className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-gray-500" /></div><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><Input aria-label="Where?" value={location} onChange={(event) => setLocation(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="City, suburb or location" className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-gray-500" /></div><Button onClick={applyFilters} className="h-12 bg-violet-600 px-6 hover:bg-violet-500"><Search className="mr-2 h-4 w-4" />Search jobs</Button></div>{professionalEnabled && <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-[0.14em] text-gray-400">New this week</p><p className="mt-2 text-2xl font-semibold text-white">{activity?.newOpportunities ?? "—"}</p><p className="mt-1 text-xs text-gray-400">Open jobs posted in the last 7 days</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-[0.14em] text-gray-400">Active applications</p><p className="mt-2 text-2xl font-semibold text-white">{activity?.activeApplications ?? "—"}</p><p className="mt-1 text-xs text-gray-400">Your pending or accepted applications</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-[0.14em] text-gray-400">Shortlisted</p><p className="mt-2 text-2xl font-semibold text-white">{activity?.shortlistedJobs ?? "—"}</p><p className="mt-1 text-xs text-gray-400">Jobs where an employer shortlisted you</p></div></div>}</div>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Job discovery views">{VIEW_OPTIONS.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => handleViewChange(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === value ? "border-violet-400/50 bg-violet-500/15 text-violet-200" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

      <div className="mt-5 flex flex-wrap items-center gap-2">{activeFilters.map((filter) => <button key={filter.label} type="button" onClick={filter.clear} className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/20">{filter.label}<X className="h-3 w-3" /></button>)}{activeFilters.length > 0 && <button type="button" onClick={resetFilters} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear all filters</button>}</div>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{filters}</aside>
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">{browseQuery.data?.items.length ?? 0} opportunities in this view</p>{browseQuery.isFetching && !browseQuery.isLoading && <p className="mt-1 text-xs text-primary">Refreshing results…</p>}</div><div className="flex items-center gap-2"><Button variant="outline" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal className="mr-2 h-4 w-4" />Filters</Button><div className="flex flex-wrap items-center gap-2"><Button variant="ghost" size="sm" onClick={() => professionalEnabled ? setAlertsOpen(true) : navigate("/sign-in")}><Bell className="mr-2 h-4 w-4" />Manage job alerts</Button><Link href="/jobs/new"><Button variant="outline"><BriefcaseBusiness className="mr-2 h-4 w-4" />Post a job</Button></Link></div></div></div>
          {browseQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-muted/50" />)}</div> : browseQuery.isError ? <EmptyState icon={Search} title="We couldn't load jobs" description="The marketplace request did not complete. Try again without losing your filters." action={<Button onClick={() => void browseQuery.refetch()}>Retry</Button>} /> : view === "saved" && !savedIds.length ? <EmptyState icon={Bookmark} title="You haven't saved any jobs yet" description="Save opportunities you're interested in and they'll appear here for your next visit." action={<Button variant="outline" onClick={() => setView("recommended")}>Browse recommended jobs</Button>} /> : jobs.length ? <><div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} {...job} matchScore={(job as { matchScore?: number }).matchScore} matchReasons={(job as { matchReasons?: Array<{ label: string; detail: string; points: number }> }).matchReasons} applicationState={(job as { applicationState?: "applied" | "shortlisted" | "under_review" | null }).applicationState} returnTo={typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/jobs"} saved={savedIds.includes(job.id)} savePending={toggleSaved.isPending} onToggleSave={professionalEnabled ? (saved) => toggleSaved.mutate({ jobId: job.id, saved }) : undefined} />)}</div><div className="mt-6 flex items-center justify-between gap-3"><Button variant="outline" disabled={offset === 0 || browseQuery.isFetching} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</Button><span className="text-xs text-muted-foreground">Showing {offset + 1}–{offset + jobs.length}</span><Button variant="outline" disabled={!browseQuery.data?.hasMore || browseQuery.isFetching} onClick={() => setOffset(browseQuery.data?.nextOffset ?? offset + 12)}>Next</Button></div></> : <EmptyState icon={BriefcaseBusiness} title={view === "saved" ? "No saved jobs in this view" : "No jobs match your current search"} description="Try adjusting your filters or searching for another vocation or location." action={<Button variant="outline" onClick={resetFilters}>Clear filters</Button>} />}
        </div>
      </section>

      <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Filter jobs</DialogTitle><DialogDescription>Refine the opportunities shown in your marketplace.</DialogDescription></DialogHeader>{filters}</DialogContent></Dialog>
      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Job alerts</DialogTitle><DialogDescription>Save this search and receive a persistent in-app alert when matching opportunities are available.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-xl border border-border bg-muted/20 p-4 text-sm"><p className="font-medium">Current criteria</p><p className="mt-1 text-muted-foreground">{[q.trim() || "Any keyword", vocation !== "all" ? VOCATION_LABELS[vocation as VocationKey] : "Any vocation", location.trim() || "Any location"].join(" · ")}</p></div><div><Label htmlFor="alert-name">Alert name</Label><Input id="alert-name" value={alertName} onChange={(event) => setAlertName(event.target.value)} placeholder="e.g. Electrical work in Johannesburg" className="mt-1.5" maxLength={120} /></div><Button className="w-full" disabled={!alertName.trim() || createAlert.isPending} onClick={() => createAlert.mutate({ name: alertName.trim(), q: q.trim() || undefined, vocation: vocation === "all" ? undefined : vocation, location: location.trim() || undefined, isUrgentOnly: urgentOnly || view === "urgent" })}><Bell className="mr-2 h-4 w-4" />Save current search</Button>{alertsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading your alerts…</p> : alertsQuery.data?.length ? <div className="space-y-2 border-t border-border pt-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your saved alerts</p>{alertsQuery.data.map((alert) => <div key={alert.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{alert.name}</p><p className="truncate text-xs text-muted-foreground">{[alert.vocation ? VOCATION_LABELS[alert.vocation as VocationKey] ?? alert.vocation : "Any vocation", alert.location || "Any location"].join(" · ")}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={`${alert.isActive ? "Pause" : "Resume"} ${alert.name}`} onClick={() => toggleAlert.mutate({ id: alert.id, isActive: !alert.isActive })} className={`rounded-lg px-2 py-1 text-xs font-semibold ${alert.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-muted text-muted-foreground"}`}>{alert.isActive ? "Active" : "Paused"}</button><button type="button" aria-label={`Delete ${alert.name}`} onClick={() => deleteAlert.mutate({ id: alert.id })} className="rounded-lg p-2 text-muted-foreground hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <p className="text-sm text-muted-foreground">No saved alerts yet. Save the current search to keep it available.</p>}</div></DialogContent></Dialog>
    </ApplicationShell>
  );
}

interface FilterPanelProps {
  q: string; setQ: (value: string) => void; vocation: string; setVocation: (value: string) => void; location: string; setLocation: (value: string) => void; sort: SortValue; setSort: (value: SortValue) => void; minBudget: string; setMinBudget: (value: string) => void; maxBudget: string; setMaxBudget: (value: string) => void; urgentOnly: boolean; setUrgentOnly: (value: boolean) => void; onApply: () => void; onReset: () => void;
}

function FilterPanel({ q, setQ, vocation, setVocation, location, setLocation, sort, setSort, minBudget, setMinBudget, maxBudget, setMaxBudget, urgentOnly, setUrgentOnly, onApply, onReset }: FilterPanelProps) {
  return <div className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" /><h2 className="font-semibold">Refine results</h2></div><button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div><div className="space-y-4"><div><Label htmlFor="job-search-filter">Keyword</Label><Input id="job-search-filter" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Role, trade, or skill" className="mt-1.5" /></div><div><Label htmlFor="job-vocation-filter">Vocation</Label><Select value={vocation} onValueChange={setVocation}><SelectTrigger id="job-vocation-filter" className="mt-1.5"><SelectValue placeholder="All vocations" /></SelectTrigger><SelectContent><SelectItem value="all">All vocations</SelectItem>{VOCATION_CATEGORIES.flatMap((category) => category.vocations.map(([key]) => key)).filter((key, index, all) => all.indexOf(key) === index).map((key) => <SelectItem key={key} value={key}>{VOCATION_LABELS[key as VocationKey]}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="job-location-filter">Location</Label><Input id="job-location-filter" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or region" className="mt-1.5" /></div><div className="grid grid-cols-2 gap-2"><div><Label htmlFor="min-budget">Min budget</Label><Input id="min-budget" type="number" min="0" value={minBudget} onChange={(event) => setMinBudget(event.target.value)} placeholder="0" className="mt-1.5" /></div><div><Label htmlFor="max-budget">Max budget</Label><Input id="max-budget" type="number" min="0" value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} placeholder="Any" className="mt-1.5" /></div></div><div><Label htmlFor="job-sort-filter">Sort by</Label><Select value={sort} onValueChange={(value) => setSort(value as SortValue)}><SelectTrigger id="job-sort-filter" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Most recent</SelectItem><SelectItem value="budget_desc">Highest budget</SelectItem><SelectItem value="deadline">Closest deadline</SelectItem></SelectContent></Select></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} className="h-4 w-4 accent-violet-600" /><span><span className="block font-medium">Urgent hiring</span><span className="text-xs text-muted-foreground">Show jobs marked urgent by the employer.</span></span></label><Button onClick={onApply} className="w-full"><Search className="mr-2 h-4 w-4" />Apply filters</Button></div></div>;
}
