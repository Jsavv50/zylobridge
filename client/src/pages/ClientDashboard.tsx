import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, Plus, Briefcase, Users, CheckCircle, Clock,
  MapPin, DollarSign, ChevronRight, Zap, Eye, Trash2,
  BarChart3, ArrowUpRight, Shield
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VOCATION_KEYS, VOCATION_LABELS, VOCATION_ICONS, type VocationKey } from "@shared/vocations";
import EscrowPaymentModal from "@/components/EscrowPaymentModal";
import { VerificationBadge } from "@/components/VerificationBadge";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  completed: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ClientDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "applications">("overview");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [escrowTarget, setEscrowTarget] = useState<{ jobId: number; professionalId: number; bidAmount: number; jobTitle: string } | null>(null);

  // Post job form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    vocation: "",
    budget: "",
    location: "",
    deadline: "",
    isUrgent: false,
  });

  const utils = trpc.useUtils();
  const { data: myJobs, isLoading: jobsLoading } = trpc.jobs.myJobs.useQuery(undefined, {
    enabled: !!user && user.userType === "client",
  });

  const { data: applications, isLoading: appsLoading } = trpc.applications.listForJob.useQuery(
    { jobId: selectedJobId! },
    { enabled: !!selectedJobId }
  );

  const { mutate: createJob, isPending: creating } = trpc.jobs.create.useMutation({
    onSuccess: () => {
      toast.success("Job posted successfully!");
      setPostJobOpen(false);
      setForm({ title: "", description: "", vocation: "", budget: "", location: "", deadline: "", isUrgent: false });
      utils.jobs.myJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateStatus } = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Job status updated.");
      utils.jobs.myJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteJob } = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted.");
      utils.jobs.myJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateAppStatus } = trpc.applications.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Application status updated.");
      utils.applications.listForJob.invalidate({ jobId: selectedJobId! });
      utils.jobs.myJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: startConversation } = trpc.messaging.getOrCreateConversation.useMutation({
    onSuccess: (conv: { id: number }) => {
      toast.success("Conversation started!");
      window.location.href = `/messages?conv=${conv.id}`;
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-gray-400">Please sign in to access your dashboard.</p>
      </div>
    );
  }

  if (user?.userType !== "client") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">This dashboard is for contractors only.</p>
        <Link href="/onboarding"><Button variant="outline" className="border-white/10 text-gray-400 bg-transparent">Set Up Profile</Button></Link>
      </div>
    );
  }

  const stats = {
    total: myJobs?.length ?? 0,
    open: myJobs?.filter((j) => j.status === "open").length ?? 0,
    inProgress: myJobs?.filter((j) => j.status === "in_progress").length ?? 0,
    completed: myJobs?.filter((j) => j.status === "completed").length ?? 0,
  };

  const handlePostJob = () => {
    if (!form.title || !form.description || !form.vocation || !form.budget || !form.location) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createJob({
      title: form.title,
      description: form.description,
      vocation: form.vocation,
      budget: Number(form.budget),
      location: form.location,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      isUrgent: form.isUrgent,
    });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Contractor Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <Dialog open={postJobOpen} onOpenChange={setPostJobOpen}>
            <DialogTrigger asChild>
              <Button
                className="font-semibold"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Post a Job
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#131a26] border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Post a New Job
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-gray-300 text-sm">Job Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Electrical rewiring for 3-bedroom house"
                    className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Vocation *</Label>
                  <Select value={form.vocation} onValueChange={(v) => setForm({ ...form, vocation: v })}>
                    <SelectTrigger className="mt-1.5 bg-[#1c2740] border-white/10 text-gray-300">
                      <SelectValue placeholder="Select a vocation" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c2740] border-white/10">
                      {VOCATION_KEYS.map((key) => (
                        <SelectItem key={key} value={key} className="text-gray-300">
                          {VOCATION_ICONS[key as VocationKey]} {VOCATION_LABELS[key as VocationKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Description *</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the project in detail..."
                    rows={4}
                    className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-sm">Budget (USD) *</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
                        placeholder="5000"
                        className="pl-7 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Deadline</Label>
                    <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="mt-1.5 bg-[#1c2740] border-white/10 text-white focus:border-violet-500/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Location *</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Austin, TX"
                    className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="urgent" checked={form.isUrgent}
                    onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-[#1c2740] accent-violet-500" />
                  <Label htmlFor="urgent" className="text-gray-300 text-sm cursor-pointer">
                    Mark as Urgent <span className="text-amber-400">(highlighted in marketplace)</span>
                  </Label>
                </div>
                <Button onClick={handlePostJob} disabled={creating} className="w-full font-semibold"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Post Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#131a26] rounded-xl p-1 w-fit border border-white/5">
          {(["overview", "jobs", "applications"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Jobs", value: stats.total, icon: Briefcase, color: "violet" },
                { label: "Open", value: stats.open, icon: Clock, color: "emerald" },
                { label: "In Progress", value: stats.inProgress, icon: ArrowUpRight, color: "blue" },
                { label: "Completed", value: stats.completed, icon: CheckCircle, color: "purple" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                  <div className={`h-9 w-9 rounded-lg bg-${color}-500/15 border border-${color}-500/25 flex items-center justify-center mb-3`}>
                    <Icon className={`h-4.5 w-4.5 text-${color}-400`} />
                  </div>
                  <p className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent Jobs */}
            <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Recent Jobs</h3>
                <button onClick={() => setActiveTab("jobs")} className="text-xs text-violet-400 hover:text-violet-300">
                  View all →
                </button>
              </div>
              {jobsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
              ) : myJobs && myJobs.length > 0 ? (
                <div className="space-y-3">
                  {myJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{VOCATION_ICONS[job.vocation as VocationKey] ?? "🔧"}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{job.title}</p>
                          <p className="text-xs text-gray-500">{job.location}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[job.status]}`}>
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-3">No jobs posted yet.</p>
                  <Button size="sm" onClick={() => setPostJobOpen(true)}
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                    Post Your First Job
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div>
            {jobsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : myJobs && myJobs.length > 0 ? (
              <div className="space-y-3">
                {myJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{VOCATION_ICONS[job.vocation as VocationKey] ?? "🔧"}</span>
                        <div>
                          <h3 className="font-semibold text-white">{job.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(job.budget).toLocaleString()}</span>
                            {job.isUrgent && <span className="flex items-center gap-1 text-amber-400"><Zap className="h-3 w-3" />Urgent</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[job.status]}`}>
                          {STATUS_LABELS[job.status]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Button size="sm" variant="ghost"
                        onClick={() => { setSelectedJobId(job.id); setActiveTab("applications"); }}
                        className="text-xs text-gray-400 hover:text-white border border-white/8 hover:border-violet-500/30">
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        View Applications
                      </Button>
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-gray-400 hover:text-white border border-white/8 hover:border-violet-500/30">
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                      </Link>
                      {job.status === "open" && (
                        <Button size="sm" variant="ghost"
                          onClick={() => updateStatus({ id: job.id, status: "cancelled" })}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40">
                          Cancel
                        </Button>
                      )}
                      {job.status === "in_progress" && (
                        <Button size="sm" variant="ghost"
                          onClick={() => updateStatus({ id: job.id, status: "completed" })}
                          className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40">
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Briefcase className="h-12 w-12 text-gray-700 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No jobs posted yet</h3>
                <p className="text-gray-500 text-sm mb-6">Post your first job to start receiving bids from skilled professionals.</p>
                <Button onClick={() => setPostJobOpen(true)}
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div>
            {/* Job selector */}
            <div className="mb-5">
              <Label className="text-gray-400 text-sm mb-2 block">Select a job to view applications:</Label>
              <Select
                value={selectedJobId?.toString() ?? ""}
                onValueChange={(v) => setSelectedJobId(Number(v))}
              >
                <SelectTrigger className="w-full max-w-sm bg-[#131a26] border-white/10 text-gray-300">
                  <SelectValue placeholder="Choose a job..." />
                </SelectTrigger>
                <SelectContent className="bg-[#131a26] border-white/10">
                  {myJobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()} className="text-gray-300">
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJobId ? (
              appsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
              ) : applications && applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Professional #{app.professionalId}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-violet-300">${Number(app.bidAmount).toLocaleString()}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            app.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" :
                            app.status === "accepted" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                            app.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                            "bg-gray-500/15 text-gray-400 border-gray-500/25"
                          }`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4">{app.coverLetter}</p>
                      <div className="flex gap-2 flex-wrap">
                        {app.status === "pending" && (
                          <>
                            <Button size="sm"
                              onClick={() => updateAppStatus({ id: app.id, status: "accepted" })}
                              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Accept
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => updateAppStatus({ id: app.id, status: "rejected" })}
                              className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40">
                              Reject
                            </Button>
                          </>
                        )}
                        {app.status === "accepted" && (
                          <>
                            <Button size="sm" variant="ghost"
                              onClick={() => setEscrowTarget({ jobId: selectedJobId!, professionalId: app.professionalId, bidAmount: Number(app.bidAmount), jobTitle: myJobs?.find(j => j.id === selectedJobId)?.title ?? "Job" })}
                              className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20">
                              <DollarSign className="h-3.5 w-3.5 mr-1" /> Fund Escrow
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => startConversation({ otherUserId: app.professionalId, jobId: selectedJobId! })}
                              className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20">
                              Message Pro
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">No applications received yet for this job.</p>
                </div>
              )
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 text-sm">Select a job above to view its applications.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Escrow Payment Modal */}
      {escrowTarget && (
        <EscrowPaymentModal
          open={!!escrowTarget}
          jobId={escrowTarget.jobId}
          professionalId={escrowTarget.professionalId}
          bidAmount={escrowTarget.bidAmount}
          jobTitle={escrowTarget.jobTitle}
          onClose={() => setEscrowTarget(null)}
        />
      )}
    </div>
  );
}
