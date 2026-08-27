import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleDot, Cog, Droplets, Layers3, MapPin, Route, Search, ShieldCheck, Sparkles, Truck, UsersRound, Zap } from "lucide-react";
import { VOCATION_CATEGORIES, VOCATION_KEYS, getVocationLabel, type VocationKey } from "@shared/vocations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ZylobridgeLogo } from "@/components/ZylobridgeLogo";

const CATEGORY_ICONS = [Layers3, Zap, Droplets, Route, Cog, Truck, Sparkles, BriefcaseBusiness, ShieldCheck, CircleDot];

const CLIENT_STEPS = [
  { step: "01", title: "Post a clear brief", description: "Describe the work, location, requirements, and budget so the right professionals can evaluate the opportunity." },
  { step: "02", title: "Review professionals and bids", description: "Compare public profiles, applications, experience, qualifications, and available verification signals." },
  { step: "03", title: "Hire and manage", description: "Keep project communication organized and move through the supported job and milestone workflow." },
];

const PROFESSIONAL_STEPS = [
  { step: "01", title: "Build your profile", description: "Showcase your vocation, skills, experience, certifications, qualifications, and portfolio." },
  { step: "02", title: "Discover opportunities", description: "Search open jobs by vocation, location, budget, and the work you want to take on." },
  { step: "03", title: "Apply and grow", description: "Submit thoughtful applications, complete work, and build a reputation through legitimate reviews." },
];

const TRUST_PILLARS = [
  { icon: UsersRound, title: "Professional profiles", description: "Structured profiles make skills, experience, qualifications, and portfolios easier to evaluate." },
  { icon: BriefcaseBusiness, title: "Structured projects", description: "Clear job briefs organize scope, location, budget, deadlines, and project expectations." },
  { icon: ShieldCheck, title: "Accountability signals", description: "Verification indicators and legitimate completed-work reviews are shown when available." },
  { icon: CheckCircle2, title: "Documented workflows", description: "Keep applications, conversations, project stages, and supported payment workflows connected." },
];

function setMeta(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`);
  const meta = existing ?? document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  if (!existing) document.head.appendChild(meta);
}

function formatBudget(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `₦${amount.toLocaleString()}` : "Budget on brief";
}

function initials(name: string | null | undefined) {
  return (name?.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "P");
}

function LiveProfessionalCard({ item }: { item: { profile: any; user: any } }) {
  const { profile, user: person } = item;
  return (
    <Link href={`/professionals/${person.id}`} className="group rounded-2xl border border-white/10 bg-[#121927] p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-[#172238] hover:shadow-2xl hover:shadow-violet-950/20">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-500/15 text-sm font-bold text-violet-200">
          {person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white group-hover:text-violet-200">{person.name || "Professional"}</h3>
              <p className="mt-1 truncate text-sm text-violet-200/80">{getVocationLabel(profile.vocation)}</p>
            </div>
            {person.isVerified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Verified account" />}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-300">
        {profile.isAvailable && <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">Available</Badge>}
        {profile.yearsExperience !== null && <Badge variant="outline" className="border-white/10 text-gray-300">{profile.yearsExperience} yrs experience</Badge>}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-xs text-gray-400">
        <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" />{profile.location || "Location not listed"}</span>
        {Number(profile.averageRating ?? 0) > 0 && <span className="text-amber-300">{Number(profile.averageRating).toFixed(1)} rating</span>}
      </div>
    </Link>
  );
}

function LiveJobCard({ job }: { job: any }) {
  return (
    <Link href={`/jobs/${job.id}`} className="group rounded-2xl border border-white/10 bg-[#121927] p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#172238] hover:shadow-2xl hover:shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{getVocationLabel(job.vocation)}</p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white group-hover:text-cyan-100">{job.title}</h3>
        </div>
        {job.isUrgent && <Badge className="shrink-0 border-amber-400/20 bg-amber-400/10 text-amber-300">Urgent</Badge>}
      </div>
      <div className="mt-6 grid gap-3 border-t border-white/8 pt-4 text-sm text-gray-400 sm:grid-cols-2">
        <span className="flex min-w-0 items-center gap-2 truncate"><MapPin className="h-4 w-4 shrink-0 text-gray-500" />{job.location || "Location not listed"}</span>
        <span className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 shrink-0 text-gray-500" />{formatBudget(job.budget)}</span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const jobsQuery = trpc.jobs.search.useQuery({ status: "open", limit: 3, offset: 0, sort: "newest" });
  const talentQuery = trpc.talent.search.useQuery({ availableOnly: false, verifiedOnly: false, limit: 3, offset: 0, sort: "newest" });

  useEffect(() => {
    document.title = "ZYLOBRIDGE — The skilled workforce marketplace";
    setMeta("description", "Connect clients, contractors, businesses, and skilled professionals through the ZYLOBRIDGE workforce marketplace.");
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}/`;
  }, []);

  const categoryCards = useMemo(() => VOCATION_CATEGORIES.slice(0, 6), []);
  const postJobHref = isAuthenticated && (user?.userType === "client" || user?.userType === "enterprise" || user?.role === "admin" || user?.role === "SUPER_ADMIN") ? "/jobs/new" : "/sign-in";
  const dashboardHref = user?.role === "admin" || user?.role === "SUPER_ADMIN" ? "/dashboard/admin" : user?.userType === "professional" ? "/dashboard/professional" : user?.userType === "enterprise" ? "/dashboard/enterprise" : "/dashboard/client";

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (searchLocation.trim()) params.set("location", searchLocation.trim());
    navigate(params.toString() ? `/talent?${params.toString()}` : "/talent");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090d14] text-white">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(6,182,212,0.14),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200"><ZylobridgeLogo compact showWordmark={false} imageClassName="h-4 w-4" /><Sparkles className="h-3.5 w-3.5" />The skilled workforce marketplace</div>
              <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Find the right professional.<span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-cyan-300 bg-clip-text text-transparent">Get the job done right.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400 sm:text-xl">ZYLOBRIDGE connects clients, contractors, businesses, and project owners with skilled professionals through a trusted marketplace for construction, infrastructure, technical, and specialized trades.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/talent"><Button size="lg" className="h-12 w-full bg-violet-600 px-6 font-semibold hover:bg-violet-500 sm:w-auto">Find a Professional <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link href={postJobHref}><Button variant="outline" size="lg" className="h-12 w-full border-white/15 bg-transparent px-6 text-gray-200 hover:border-violet-400/50 hover:bg-white/5 sm:w-auto">Post a Job</Button></Link>
                <Link href="/jobs" className="inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">Find Work <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </div>
              <Link href="/how-it-works" className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">See how ZYLOBRIDGE works <ChevronRight className="h-4 w-4" /></Link>
              {isAuthenticated && <Link href={dashboardHref} className="mt-5 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">Open your workspace <ChevronRight className="h-4 w-4" /></Link>}
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2rem] bg-violet-500/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/12 bg-[#101722]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5">
                <div className="flex items-center justify-between border-b border-white/8 pb-4"><div><p className="text-xs uppercase tracking-[0.18em] text-gray-500">Marketplace signal</p><h2 className="mt-1 text-lg font-semibold text-white">From brief to connection</h2></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></div></div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/8 p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200"><UsersRound className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-white">Professional profile</p><p className="text-xs text-gray-400">Vocation · experience · qualifications</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" /></div></div>
                  <div className="ml-7 h-5 border-l border-dashed border-white/20" />
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-200"><BriefcaseBusiness className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-white">Structured opportunity</p><p className="text-xs text-gray-400">Scope · location · budget · deadline</p></div><ArrowRight className="ml-auto h-4 w-4 text-cyan-300" /></div></div>
                  <div className="ml-7 h-5 border-l border-dashed border-white/20" />
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200"><ShieldCheck className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-white">Project connection</p><p className="text-xs text-gray-400">Applications · conversations · milestones</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-300" /></div></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500"><span>Discover</span><span>Evaluate</span><span>Connect</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/8 bg-[#111927]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-7 sm:px-6 md:grid-cols-4 lg:px-8">
            {[{ icon: UsersRound, label: "Skilled professional profiles" }, { icon: BriefcaseBusiness, label: "Structured job briefs" }, { icon: ShieldCheck, label: "Verification where available" }, { icon: CheckCircle2, label: "Documented workflows" }].map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-3 text-sm font-medium text-gray-200"><Icon className="h-5 w-5 shrink-0 text-emerald-400" />{label}</div>)}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Start with a search</p><h2 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What are you looking for?</h2><p className="mt-4 max-w-lg leading-7 text-gray-400">Search the live professional directory by trade, skill, vocation, or location.</p></div><form onSubmit={submitSearch} className="rounded-2xl border border-white/10 bg-[#111927] p-3 shadow-xl shadow-black/15"><div className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]"><label className="relative block"><span className="sr-only">Trade, skill, or vocation</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Electrician, plumber, solar..." className="h-12 w-full rounded-xl border border-white/10 bg-[#0b111c] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-400/60" /></label><label className="relative block"><span className="sr-only">Location</span><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={searchLocation} onChange={(event) => setSearchLocation(event.target.value)} placeholder="City or region" className="h-12 w-full rounded-xl border border-white/10 bg-[#0b111c] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-400/60" /></label><Button type="submit" size="lg" className="h-12 rounded-xl bg-violet-600 px-5 hover:bg-violet-500">Search</Button></div></form></div>
          <div className="mt-6 flex flex-wrap gap-2"><span className="mr-2 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Popular</span>{["electrician", "plumber", "mason_bricklayer", "painter", "carpenter"].map((key) => <Link key={key} href={`/talent?vocation=${key}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-gray-300 transition hover:border-violet-400/40 hover:text-white">{getVocationLabel(key)}</Link>)}</div>
        </section>

        <section className="border-y border-white/8 bg-[#0f1622]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Explore the network</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Find the right vocation</h2><p className="mt-4 max-w-2xl leading-7 text-gray-400">Browse the expanding catalog by category, then move directly into live professional discovery.</p></div><Link href="/talent" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">Explore all professions <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categoryCards.map((category, index) => { const Icon = CATEGORY_ICONS[index] ?? Layers3; return <div key={category.key} className="rounded-2xl border border-white/10 bg-[#121927] p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-white">{category.label}</h3></div><div className="mt-5 flex flex-wrap gap-2">{category.vocations.slice(0, 4).map(([key, label]) => <Link key={key} href={`/talent?vocation=${key}`} className="rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-gray-400 transition hover:border-violet-400/40 hover:text-violet-100">{label}</Link>)}</div></div>; })}</div></div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Live discovery</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Meet professionals ready to work</h2><p className="mt-4 max-w-2xl leading-7 text-gray-400">Public professional profiles appear here when they are available for discovery. No invented profiles or ratings are used.</p></div><Link href="/talent" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white">View all professionals <ArrowRight className="h-4 w-4" /></Link></div>{talentQuery.isLoading ? <div className="mt-10 grid gap-4 md:grid-cols-3"><div className="h-56 animate-pulse rounded-2xl bg-white/5" /><div className="h-56 animate-pulse rounded-2xl bg-white/5" /><div className="h-56 animate-pulse rounded-2xl bg-white/5" /></div> : talentQuery.data?.items.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{talentQuery.data.items.map((item) => <LiveProfessionalCard key={item.user.id} item={item} />)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center"><UsersRound className="mx-auto h-8 w-8 text-gray-600" /><h3 className="mt-4 font-semibold text-white">The directory is ready for your profile</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-400">No public profiles are available in this view yet. Professionals can create a profile, and clients can browse as the directory grows.</p><Link href="/sign-in" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white">Create a profile <ArrowRight className="h-4 w-4" /></Link></div>}</section>

        <section className="border-y border-white/8 bg-[#111927]"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Open opportunities</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Find your next opportunity</h2><p className="mt-4 max-w-2xl leading-7 text-gray-400">Currently open jobs from the live marketplace, with direct links to their canonical details.</p></div><Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">Browse all jobs <ArrowRight className="h-4 w-4" /></Link></div>{jobsQuery.isLoading ? <div className="mt-10 grid gap-4 md:grid-cols-3"><div className="h-52 animate-pulse rounded-2xl bg-white/5" /><div className="h-52 animate-pulse rounded-2xl bg-white/5" /><div className="h-52 animate-pulse rounded-2xl bg-white/5" /></div> : jobsQuery.data?.items.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{jobsQuery.data.items.map((job) => <LiveJobCard key={job.id} job={job} />)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-gray-600" /><h3 className="mt-4 font-semibold text-white">No open jobs are available right now</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-400">Employers can publish a structured brief, while professionals can explore the marketplace as new opportunities arrive.</p><Link href={postJobHref} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">Post a job <ArrowRight className="h-4 w-4" /></Link></div>}</div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Two-sided by design</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>A better path for both sides of the work</h2></div><div className="mt-12 grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-transparent p-7 sm:p-9"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200"><BriefcaseBusiness className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.16em] text-violet-300">For clients and contractors</p><h3 className="mt-1 text-2xl font-semibold text-white">Build the right team</h3></div></div><div className="mt-8 space-y-6">{CLIENT_STEPS.map((item) => <div key={item.step} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 text-xs font-bold text-violet-200">{item.step}</span><div><h4 className="font-semibold text-white">{item.title}</h4><p className="mt-1 text-sm leading-6 text-gray-400">{item.description}</p></div></div>)}</div><Link href={postJobHref} className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white">Post a Job <ArrowRight className="h-4 w-4" /></Link></div><div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-7 sm:p-9"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200"><Zap className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">For skilled professionals</p><h3 className="mt-1 text-2xl font-semibold text-white">Turn skill into opportunity</h3></div></div><div className="mt-8 space-y-6">{PROFESSIONAL_STEPS.map((item) => <div key={item.step} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 text-xs font-bold text-cyan-200">{item.step}</span><div><h4 className="font-semibold text-white">{item.title}</h4><p className="mt-1 text-sm leading-6 text-gray-400">{item.description}</p></div></div>)}</div><Link href="/jobs" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">Find Work <ArrowRight className="h-4 w-4" /></Link></div></div></section>

        <section className="border-y border-white/8 bg-[#0f1622]"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Why ZYLOBRIDGE</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Work with confidence</h2><p className="mt-4 leading-7 text-gray-400">The platform is designed to make skilled work easier to discover, evaluate, coordinate, and complete with clearer expectations.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{TRUST_PILLARS.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-2xl border border-white/10 bg-[#121927] p-5"><Icon className="h-5 w-5 text-emerald-300" /><h3 className="mt-5 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-400">{description}</p></div>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="relative overflow-hidden rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-400/10 via-[#131a26] to-violet-500/10 p-8 sm:p-12"><div className="relative max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Built for projects of every size</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>From the first repair to a growing workforce</h2><p className="mt-5 max-w-2xl leading-7 text-gray-400">Individuals, contractors, and businesses can use the same marketplace foundation to find skilled professionals, build teams, and organize project requirements.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="font-semibold text-white">Individuals</p><p className="mt-2 text-sm leading-6 text-gray-400">Find skilled professionals for repairs and specialized work.</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="font-semibold text-white">Contractors</p><p className="mt-2 text-sm leading-6 text-gray-400">Discover workers, build teams, and manage requirements.</p></div><div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="font-semibold text-white">Business and enterprise</p><p className="mt-2 text-sm leading-6 text-gray-400">Support larger workforce and project needs through the platform.</p></div></div><Link href="/enterprise" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-amber-100 hover:text-white">Explore Enterprise <ArrowRight className="h-4 w-4" /></Link></div></div></section>

        <section className="border-y border-white/8 bg-[#111927]"><div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Building the future of skilled work</p><h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>The right people build great things.</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">Whether you need skilled professionals for your next project or you are ready to discover your next opportunity, ZYLOBRIDGE brings people and work together.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/talent"><Button size="lg" className="h-12 bg-violet-600 px-7 hover:bg-violet-500">Find a Professional <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Link href="/jobs"><Button variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-7 text-gray-200 hover:border-cyan-400/40 hover:bg-white/5">Find Work</Button></Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
