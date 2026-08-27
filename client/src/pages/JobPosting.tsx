import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Loader2, MapPin, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getVocationLabel } from "@shared/vocations";
import VocationSelector from "@/components/VocationSelector";

const steps = ["Brief", "Scope", "Review"];

export default function JobPosting() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ title: "", vocation: "", description: "", budget: "", location: "", deadline: "", isUrgent: false });
  const createJob = trpc.jobs.create.useMutation({
    onSuccess: (result) => {
      toast.success("Job published successfully.");
      navigate(result.job?.id ? `/jobs/${result.job.id}` : "/employer/jobs");
    },
    onError: (error) => toast.error(error.message || "We couldn't publish this job."),
  });
  const canPost = user?.userType === "client" || user?.userType === "enterprise" || user?.role === "admin" || user?.role === "SUPER_ADMIN";
  const preview = useMemo(() => ({ ...form, budget: Number(form.budget || 0) }), [form]);

  if (!user) return <ApplicationShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></ApplicationShell>;
  if (!canPost) return <ApplicationShell><EmptyState icon={BriefcaseBusiness} title="Employer access required" description="Only client, enterprise, or administrative accounts can publish jobs." action={<Link href="/jobs"><Button variant="outline">Browse open jobs</Button></Link>} /></ApplicationShell>;

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const next = () => {
    if (step === 0 && (!form.title.trim() || !form.vocation)) return toast.error("Add a title and vocation to continue.");
    if (step === 1 && (!form.description.trim() || form.description.trim().length < 10 || !form.budget || !form.location.trim())) return toast.error("Add the project scope, budget, and location to continue.");
    setStep((current) => Math.min(2, current + 1));
  };
  const publish = () => {
    createJob.mutate({ title: form.title.trim(), description: form.description.trim(), vocation: form.vocation, budget: preview.budget, location: form.location.trim(), deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined, isUrgent: form.isUrgent });
  };

  return <ApplicationShell role={user.userType === "enterprise" ? "enterprise" : "employer"}>
    <PageHeader title="Post a job" description="Create a clear, trusted brief for the professionals best suited to your project." action={<Link href="/employer/jobs" className="text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="inline h-4 w-4 mr-1" />Back to postings</Link>} />
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 grid grid-cols-3 gap-2">{steps.map((label, index) => <div key={label} className={`rounded-xl border p-3 ${index <= step ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}><div className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index < step ? "bg-emerald-500 text-white" : index === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></div></div>)}</div>
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        {step === 0 && <div className="space-y-5"><div><h2 className="text-xl font-semibold">Start with the outcome</h2><p className="mt-1 text-sm text-muted-foreground">A specific title and trade category improve the quality of applications.</p></div><div><Label htmlFor="job-title">Job title</Label><Input id="job-title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Electrical rewiring for a three-bedroom home" className="mt-1.5" maxLength={200} /></div><div><Label htmlFor="job-vocation">Vocation</Label><VocationSelector id="job-vocation" value={form.vocation} onChange={(value) => update("vocation", value)} placeholder="Select a vocation" /></div></div>}
        {step === 1 && <div className="space-y-5"><div><h2 className="text-xl font-semibold">Define the scope</h2><p className="mt-1 text-sm text-muted-foreground">Explain what success looks like, then set a transparent budget and location.</p></div><div><Label htmlFor="job-description">Project description</Label><Textarea id="job-description" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the deliverables, constraints, materials, and expected outcome." rows={8} maxLength={5000} className="mt-1.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{form.description.length}/5000</p></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="job-budget">Budget (NGN)</Label><Input id="job-budget" type="number" min="1" value={form.budget} onChange={(event) => update("budget", event.target.value)} placeholder="250000" className="mt-1.5" /></div><div><Label htmlFor="job-deadline">Application deadline</Label><Input id="job-deadline" type="date" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} className="mt-1.5" /></div></div><div><Label htmlFor="job-location">Location</Label><div className="relative mt-1.5"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="job-location" value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="City or region" className="pl-9" /></div></div><label className="flex items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" checked={form.isUrgent} onChange={(event) => update("isUrgent", event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span><span className="block text-sm font-medium">Mark this opportunity urgent</span><span className="mt-1 block text-xs text-muted-foreground">Urgent jobs receive a visible marketplace highlight.</span></span></label></div>}
        {step === 2 && <div className="space-y-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Sparkles className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Review before publishing</h2><p className="mt-1 text-sm text-muted-foreground">This is a local draft preview. Publishing uses the existing server-side job lifecycle and creates an open job.</p></div></div><div className="rounded-2xl border border-border bg-background/60 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{form.vocation ? getVocationLabel(form.vocation) : "Vocation"}</p><h3 className="mt-2 text-xl font-semibold">{form.title || "Untitled job"}</h3></div><StatusBadge status={form.isUrgent ? "warning" : "info"} label={form.isUrgent ? "Urgent" : "Ready to publish"} /></div><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{form.description || "No project description yet."}</p><div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Budget</p><p className="mt-1 font-semibold">₦{preview.budget.toLocaleString()}</p></div><div><p className="text-xs text-muted-foreground">Location</p><p className="mt-1 font-semibold">{form.location || "Not set"}</p></div><div><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1 font-semibold">{form.deadline || "Flexible"}</p></div></div></div></div>}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">{step > 0 ? <Button variant="outline" onClick={() => setStep((current) => current - 1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button> : <span />}{step < 2 ? <Button onClick={next}>Continue<ArrowRight className="h-4 w-4 ml-2" /></Button> : <Button onClick={publish} disabled={createJob.isPending}>{createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publish job</Button>}</div>
      </section>
    </div>
  </ApplicationShell>;
}
