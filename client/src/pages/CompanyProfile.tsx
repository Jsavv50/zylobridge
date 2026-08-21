import { Link, useParams } from "wouter";
import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, Loader2, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";

export default function CompanyProfile() {
  const { slug } = useParams<{ slug: string }>();
  const query = trpc.companies.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: Boolean(slug) });
  if (query.isLoading) return <ApplicationShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></ApplicationShell>;
  if (query.isError || !query.data) return <ApplicationShell><EmptyState icon={Building2} title="Company profile unavailable" description="This company may no longer publish a public profile." action={<Link href="/jobs"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to jobs</Button></Link>} /></ApplicationShell>;
  const { organization, activeJobs, stats } = query.data;
  return <ApplicationShell>
    <div className="mb-5"><Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to marketplace</Link></div>
    <PageHeader title={organization.name} description="Company profile and current opportunities on Zylobridge" action={organization.description ? <StatusBadge status="success" label="Active company" /> : undefined} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
      <main className="space-y-6 min-w-0"><section className="rounded-2xl border border-border bg-card p-6 md:p-8"><div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-7 w-7" /></div><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Organization</p><h2 className="mt-1 text-2xl font-semibold">{organization.name}</h2></div></div><p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{organization.description || "This organization has not added a public company description yet."}</p><div className="mt-6 flex flex-wrap gap-2"><StatusBadge status="success" label="Verified marketplace account" /><StatusBadge status="neutral" label={`${stats.activeMembers} active members`} /></div></section><section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Open roles</h2><p className="mt-1 text-sm text-muted-foreground">Current public opportunities posted by this organization.</p></div><span className="text-sm text-muted-foreground">{stats.activeJobs} active</span></div>{activeJobs.length ? <div className="grid gap-4 md:grid-cols-2">{activeJobs.map((job) => <JobCard key={job.id} {...job} />)}</div> : <EmptyState icon={BriefcaseBusiness} title="No open roles right now" description="Check back later for new opportunities from this organization." />}</section></main>
      <aside className="space-y-4 lg:sticky lg:top-24"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Company snapshot</h2><div className="mt-5 space-y-4 text-sm"><p className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><BriefcaseBusiness className="h-4 w-4" />Open roles</span><span className="font-semibold">{stats.activeJobs}</span></p><p className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><UsersRound className="h-4 w-4" />Active members</span><span className="font-semibold">{stats.activeMembers}</span></p><p className="flex items-center gap-2 text-emerald-500"><CheckCircle2 className="h-4 w-4" />Organization workspace active</p></div></section></aside>
    </div>
  </ApplicationShell>;
}
