import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, DollarSign, Loader2, MapPin, Share2, ShieldCheck, Star, Zap } from "lucide-react";
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
  const from = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") : null;
  const backHref = from?.startsWith("/jobs") ? from : "/jobs";
  const [showApplication, setShowApplication] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
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

  const savedStatus = trpc.savedJobs.status.useQuery({ jobId: Number(id) }, { enabled: isAuthenticated && user?.userType === "professional" && Number.isInteger(Number(id)) });
  const toggleSaved = trpc.savedJobs.toggle.useMutation({
    onSuccess: () => void savedStatus.refetch(),
    onError: (error) => toast.error(error.message || "We couldn't update saved jobs."),
  });

  const submitReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Your review was submitted.");
      setReviewRating(0);
      setReviewComment("");
    },
    onError: (error) => toast.error(error.message || "We couldn't submit your review."),
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
  const canReview = Boolean(user && isAuthenticated && job.status === "completed" && (user.id === job.clientId ? job.assignedProfessionalId : user.id === job.assignedProfessionalId));
  const revieweeId = user ? (user.id === job.clientId ? job.assignedProfessionalId : job.clientId) : undefined;
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
      <div className="mb-5"><Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to job discovery</Link></div>
      <PageHeader title={job.title} description={`${VOCATION_LABELS[vocation] ?? job.vocation} · posted ${formatDate(job.createdAt)}`} action={<div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={meta.tone} label={meta.label} />{isAuthenticated && user?.userType === "professional" && <Button variant="outline" size="sm" onClick={() => toggleSaved.mutate({ jobId: job.id, saved: !savedStatus.data?.saved })} disabled={toggleSaved.isPending}><span aria-hidden="true">☆</span>{savedStatus.data?.saved ? "Saved" : "Save job"}</Button>}<Button variant="outline" size="sm" onClick={() => { if (navigator.clipboard) { void navigator.clipboard.writeText(window.location.href).then(() => toast.success("Job link copied.")); } else { toast.info("Copy this page URL to share the job."); } }}><Share2 className="mr-1.5 h-4 w-4" />Share</Button></div>} />
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
          {canReview && revieweeId && <section className="rounded-2xl border border-border bg-card p-6 md:p-8"><div><p className="text-sm text-muted-foreground">Project complete</p><h2 className="mt-1 text-xl font-semibold">Leave a review</h2><p className="mt-2 text-sm text-muted-foreground">Share an accurate account of your experience with the other job participant.</p></div><div className="mt-6 space-y-5 border-t border-border/70 pt-6"><div><Label>Rating</Label><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={reviewRating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setReviewRating(value)} className="rounded-md p-1 text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Star className={value <= reviewRating ? "h-6 w-6 fill-current" : "h-6 w-6"} /></button>)}</div></div><div><Label htmlFor="review-comment">Comment (optional)</Label><Textarea id="review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={5} maxLength={2000} placeholder="Describe the quality, communication, and professionalism you experienced." className="mt-1.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{reviewComment.length}/2000</p></div><Button onClick={() => { if (reviewRating < 1) { toast.error("Choose a rating from 1 to 5 stars."); return; } submitReview.mutate({ jobId: job.id, revieweeId, rating: reviewRating, comment: reviewComment.trim() || undefined }); }} disabled={submitReview.isPending}>{submitReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit review</Button></div></section>}
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
