import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, DollarSign, Loader2, MapPin, ShieldCheck, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { VOCATION_LABELS, VOCATION_ICONS, type VocationKey } from "@shared/vocations";

const statusMeta: Record<string, { label: string; tone: "success" | "info" | "warning" | "error" | "neutral" }> = {
  open: { label: "Open for applications", tone: "success" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "error" },
};

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not specified";
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [showApplication, setShowApplication] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const jobQuery = trpc.jobs.getById.useQuery({ id: Number(id) }, { enabled: Number.isInteger(Number(id)) && Number(id) > 0 });
  const submitApplication = trpc.applications.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Application submitted successfully.");
      setShowApplication(false);
      setCoverLetter("");
      setBidAmount("");
    },
    onError: (error) => toast.error(error.message || "We couldn't submit your application."),
  });

  if (jobQuery.isLoading) {
    return <ApplicationShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></ApplicationShell>;
  }
  if (jobQuery.isError || !jobQuery.data) {
    return <ApplicationShell><EmptyState title="Job not found" description="This opportunity may have been closed or is no longer available." action={<Link href="/jobs"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to jobs</Button></Link>} /></ApplicationShell>;
  }

  const job = jobQuery.data;
  const viewerIsProfessional = user?.userType === "professional";
  const canApply = isAuthenticated && viewerIsProfessional && job.status === "open" && user.id !== job.clientId;
  const meta = statusMeta[job.status] ?? statusMeta.open;
  const vocation = job.vocation as VocationKey;

  const handleSubmit = () => {
    const amount = Number(bidAmount);
    if (!coverLetter.trim() || coverLetter.trim().length < 10 || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Add a cover letter and a valid bid amount before submitting.");
      return;
    }
    submitApplication.mutate({ jobId: job.id, coverLetter: coverLetter.trim(), bidAmount: amount });
  };

  return (
    <ApplicationShell>
      <div className="mb-5"><Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to job discovery</Link></div>
      <PageHeader title={job.title} description={`${VOCATION_LABELS[vocation] ?? job.vocation} · posted ${formatDate(job.createdAt)}`} action={<StatusBadge status={meta.tone} label={meta.label} />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <main className="space-y-6 min-w-0">
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{VOCATION_ICONS[vocation] ?? "🔧"}</div>
              <div className="min-w-0"><p className="text-sm text-muted-foreground">Project brief</p><h2 className="mt-1 text-xl font-semibold">What the client needs</h2></div>
              {job.isUrgent && <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500"><Zap className="h-3.5 w-3.5" />Urgent</span>}
            </div>
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{job.description}</p>
          </section>

          {canApply && <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Ready to apply?</h2><p className="text-sm text-muted-foreground">Share your approach and proposed budget with the client.</p></div><Button onClick={() => setShowApplication((value) => !value)}>{showApplication ? "Close application" : "Apply for this job"}</Button></div>
            {showApplication && <div className="mt-6 space-y-4 border-t border-border/70 pt-6">
              <div><Label htmlFor="bid-amount">Your proposed budget</Label><Input id="bid-amount" type="number" min="1" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} placeholder="e.g. 250000" className="mt-1.5" /></div>
              <div><Label htmlFor="cover-letter">Cover letter</Label><Textarea id="cover-letter" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} rows={7} maxLength={3000} placeholder="Explain your relevant experience, proposed approach, and availability." className="mt-1.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{coverLetter.length}/3000</p></div>
              <Button onClick={handleSubmit} disabled={submitApplication.isPending}>{submitApplication.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit application</Button>
            </div>}
          </section>}
          {!isAuthenticated && job.status === "open" && <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center"><p className="text-sm text-muted-foreground">Sign in as a professional to submit an application.</p><a href={getLoginUrl()}><Button className="mt-4">Sign in to apply</Button></a></section>}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Opportunity details</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex items-start gap-3"><DollarSign className="h-4 w-4 mt-0.5 text-primary" /><div><dt className="text-muted-foreground">Budget</dt><dd className="font-semibold">₦{Number(job.budget).toLocaleString()}</dd></div></div><div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary" /><div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{job.location}</dd></div></div><div className="flex items-start gap-3"><CalendarDays className="h-4 w-4 mt-0.5 text-primary" /><div><dt className="text-muted-foreground">Application deadline</dt><dd className="font-medium">{formatDate(job.deadline)}</dd></div></div><div className="flex items-start gap-3"><Clock3 className="h-4 w-4 mt-0.5 text-primary" /><div><dt className="text-muted-foreground">Posted</dt><dd className="font-medium">{formatDate(job.createdAt)}</dd></div></div></dl></section>
          <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Trust signals</h2><div className="mt-4 space-y-3 text-sm text-muted-foreground"><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" />Secure application flow</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Protected marketplace account</p><p className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" />Escrow and dispute support</p></div></section>
          {job.organizationSlug && <Link href={`/companies/${job.organizationSlug}`} className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Posted through</p><p className="mt-2 font-semibold">{job.organizationName || "Organization workspace"}</p><p className="mt-1 text-sm text-muted-foreground">View the company profile.</p></Link>}
        </aside>
      </div>
    </ApplicationShell>
  );
}
