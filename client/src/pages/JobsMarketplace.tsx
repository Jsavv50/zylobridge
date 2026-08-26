import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, SlidersHorizontal, MapPin, BriefcaseBusiness, RotateCcw, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JobCard from "@/components/JobCard";
import { ApplicationShell, EmptyState, PageHeader } from "@/components/shell/ZyloShell";
import { VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";

function readSearchParams() {
  if (typeof window === "undefined") return { q: "", vocation: "all", location: "", sort: "newest" as const };
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") ?? "",
    vocation: params.get("vocation") ?? "all",
    location: params.get("location") ?? "",
    sort: (params.get("sort") as "newest" | "budget_desc" | "deadline") || "newest",
  };
}

export default function JobsMarketplace() {
  const [, navigate] = useLocation();
  const initial = useMemo(readSearchParams, []);
  const [q, setQ] = useState(initial.q);
  const [vocation, setVocation] = useState(initial.vocation);
  const [location, setLocation] = useState(initial.location);
  const [sort, setSort] = useState<"newest" | "budget_desc" | "deadline">(initial.sort);
  const [offset, setOffset] = useState(0);

  const input = useMemo(() => ({
    q: q.trim() || undefined,
    vocation: vocation === "all" ? undefined : vocation,
    location: location.trim() || undefined,
    sort,
    status: "open" as const,
    limit: 12,
    offset,
  }), [q, vocation, location, sort, offset]);
  const { data, isLoading, isFetching, isError, refetch } = trpc.jobs.search.useQuery(input);

  const applyFilters = () => {
    setOffset(0);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (vocation !== "all") params.set("vocation", vocation);
    if (location.trim()) params.set("location", location.trim());
    if (sort !== "newest") params.set("sort", sort);
    navigate(params.toString() ? `/jobs?${params.toString()}` : "/jobs");
    void refetch();
  };

  const resetFilters = () => {
    setQ("");
    setVocation("all");
    setLocation("");
    setSort("newest");
    setOffset(0);
    navigate("/jobs");
  };

  return (
    <ApplicationShell>
      <PageHeader
        title="Find work that moves your career forward"
        description="Explore verified opportunities from clients and growing teams. Every result is filtered server-side and linked to its canonical job record."
        action={<Link href="/talent" className="text-sm text-primary hover:underline">Browse talent <ArrowRight className="inline h-4 w-4 ml-1" /></Link>}
      />

      <section className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Refine results</h2>
            </div>
            <button type="button" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Reset job filters">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="job-search">Search</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="job-search" value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="Role, trade, or keyword" className="pl-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="job-vocation">Vocation</Label>
              <Select value={vocation} onValueChange={setVocation}>
                <SelectTrigger id="job-vocation" className="mt-1.5"><SelectValue placeholder="All vocations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vocations</SelectItem>
                  {VOCATION_KEYS.map((key) => <SelectItem key={key} value={key}>{VOCATION_LABELS[key as VocationKey]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="job-location">Location</Label>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="job-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or region" className="pl-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="job-sort">Sort by</Label>
              <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
                <SelectTrigger id="job-sort" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="budget_desc">Highest budget</SelectItem>
                  <SelectItem value="deadline">Closest deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyFilters} className="w-full"><Search className="h-4 w-4 mr-2" />Apply filters</Button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{data?.items.length ?? 0} opportunities in this view</p>
              {isFetching && !isLoading && <p className="text-xs text-primary mt-1">Refreshing results…</p>}
            </div>
            <Link href="/jobs/new"><Button variant="outline"><BriefcaseBusiness className="h-4 w-4 mr-2" />Post a job</Button></Link>
          </div>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2"><div className="h-52 rounded-2xl bg-muted/50 animate-pulse" /><div className="h-52 rounded-2xl bg-muted/50 animate-pulse" /></div>
          ) : isError ? (
            <EmptyState icon={Search} title="We couldn't load jobs" description="The marketplace request did not complete. Try again without losing your filters." action={<Button onClick={() => void refetch()}>Retry</Button>} />
          ) : data?.items.length ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {data.items.map((job) => <JobCard key={job.id} {...job} />)}
              </div>
              <div className="flex items-center justify-between mt-6">
                <Button variant="outline" disabled={offset === 0 || isFetching} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</Button>
                <span className="text-xs text-muted-foreground">Showing {offset + 1}–{offset + data.items.length}</span>
                <Button variant="outline" disabled={!data.hasMore || isFetching} onClick={() => setOffset(data.nextOffset ?? offset + 12)}>Next</Button>
              </div>
            </>
          ) : (
            <EmptyState icon={BriefcaseBusiness} title="No open jobs match these filters" description="Try a broader search or clear one of the filters to see more opportunities." action={<Button variant="outline" onClick={resetFilters}>Clear filters</Button>} />
          )}
        </div>
      </section>
    </ApplicationShell>
  );
}
