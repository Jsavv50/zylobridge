import { BriefcaseBusiness, CheckCircle2, Clock3, Loader2, Plus, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";
import { VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { toast } from "sonner";

const lifecycle: Record<string, { label: string; tone: "success" | "info" | "warning" | "error" | "neutral" }> = { open: { label: "Open", tone: "success" }, in_progress: { label: "In progress", tone: "info" }, completed: { label: "Completed", tone: "neutral" }, cancelled: { label: "Cancelled", tone: "error" } };

export default function EmployerJobs() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const query = trpc.jobs.myJobs.useQuery(undefined, { enabled: Boolean(user && (user.userType === "client" || user.userType === "enterprise")) });
  const utils = trpc.useUtils();
  const updateStatus = trpc.jobs.updateStatus.useMutation({ onSuccess: () => { toast.success("Job status updated."); void utils.jobs.myJobs.invalidate(); }, onError: (error) => toast.error(error.message) });

  if (!user) return <ApplicationShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></ApplicationShell>;
  if (user.userType !== "client" && user.userType !== "enterprise") return <ApplicationShell><EmptyState icon={BriefcaseBusiness} title="Employer workspace required" description="This route is available to client and enterprise accounts." action={<Link href="/jobs"><Button variant="outline">Browse jobs</Button></Link>} /></ApplicationShell>;
  const jobs = query.data ?? [];
  return <ApplicationShell role={user.userType === "enterprise" ? "enterprise" : "employer"}>
    <PageHeader title="My job postings" description="Manage your live opportunities and move each job through its existing lifecycle." action={<Link href="/jobs/new"><Button><Plus className="h-4 w-4 mr-2" />Post a job</Button></Link>} />
    {query.isLoading ? <div className="space-y-3"><div className="h-28 rounded-2xl bg-muted/50 animate-pulse" /><div className="h-28 rounded-2xl bg-muted/50 animate-pulse" /></div> : query.isError ? <EmptyState title="Couldn't load your postings" description="Try again to retrieve jobs owned by this account." action={<Button onClick={() => void query.refetch()}>Retry</Button>} /> : jobs.length === 0 ? <EmptyState icon={BriefcaseBusiness} title="No job postings yet" description="Create your first clear, structured job brief to start receiving applications." action={<Link href="/jobs/new"><Button><Plus className="h-4 w-4 mr-2" />Create a job</Button></Link>} /> : <div className="space-y-3">{jobs.map((job) => { const status = lifecycle[job.status] ?? lifecycle.open; return <article key={job.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">Job #{job.id}</span><StatusBadge status={status.tone} label={status.label} />{job.isUrgent && <StatusBadge status="warning" label="Urgent" />}</div><h2 className="mt-2 truncate text-lg font-semibold">{job.title}</h2><p className="mt-1 text-sm text-muted-foreground">{VOCATION_LABELS[job.vocation as VocationKey] ?? job.vocation} · {job.location}</p></div><div className="flex shrink-0 gap-2"><Link href={`/jobs/${job.id}`}><Button variant="outline">View detail</Button></Link>{job.status === "open" && <Button variant="outline" onClick={() => updateStatus.mutate({ id: job.id, status: "cancelled" })} disabled={updateStatus.isPending}>Pause posting</Button>}{job.status === "in_progress" && <Button variant="outline" onClick={() => updateStatus.mutate({ id: job.id, status: "completed" })} disabled={updateStatus.isPending}><CheckCircle2 className="h-4 w-4 mr-2" />Mark complete</Button>}</div></div><div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3"><p className="flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4 text-primary" />Posted {new Date(job.createdAt).toLocaleDateString()}</p><p className="flex items-center gap-2 text-muted-foreground"><BriefcaseBusiness className="h-4 w-4 text-primary" />Budget ₦{Number(job.budget).toLocaleString()}</p><Link href={`/jobs/${job.id}`} className="flex items-center gap-2 text-primary hover:underline"><UsersRound className="h-4 w-4" />Review candidates</Link></div></article>; })}</div>}
  </ApplicationShell>;
}
