import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, MapPin, DollarSign, Calendar, Clock, Zap,
  ArrowLeft, CheckCircle, User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { VOCATION_LABELS, VOCATION_ICONS, type VocationKey } from "@shared/vocations";

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

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);

  const { data: job, isLoading } = trpc.jobs.getById.useQuery({ id: Number(id) });
  const utils = trpc.useUtils();

  const { mutate: submitApplication, isPending: isApplying } = trpc.applications.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      setShowApplyForm(false);
      setCoverLetter("");
      setBidAmount("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit application.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Job not found.</p>
        <Link href="/marketplace">
          <Button variant="outline" className="border-white/10 text-gray-400 bg-transparent">
            Back to Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  const vKey = job.vocation as VocationKey;
  const isProfessional = user?.userType === "professional";
  const isOwner = user?.id === job.clientId;
  const canApply = isAuthenticated && isProfessional && job.status === "open" && !isOwner;

  const handleApply = () => {
    if (!coverLetter.trim() || !bidAmount) {
      toast.error("Please fill in all fields.");
      return;
    }
    submitApplication({
      jobId: job.id,
      coverLetter: coverLetter.trim(),
      bidAmount: Number(bidAmount),
    });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8">
        {/* Back */}
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="rounded-xl border border-white/8 bg-[#131a26] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{VOCATION_ICONS[vKey] ?? "🔧"}</span>
                  <div>
                    <h1
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {job.title}
                    </h1>
                    <p className="text-sm text-gray-500">{VOCATION_LABELS[vKey] ?? job.vocation}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                  {job.isUrgent && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <Zap className="h-3 w-3" />
                      Urgent
                    </span>
                  )}
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Apply Form */}
            {canApply && (
              <div className="rounded-xl border border-violet-500/20 bg-[#131a26] p-6">
                <h3 className="font-semibold text-white mb-4">Submit Your Application</h3>
                {!showApplyForm ? (
                  <Button
                    onClick={() => setShowApplyForm(true)}
                    className="font-semibold"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                  >
                    Apply for This Job
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 text-sm mb-1.5 block">Your Bid Amount (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          placeholder="Enter your bid"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="pl-7 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm mb-1.5 block">Cover Letter</Label>
                      <Textarea
                        placeholder="Describe your relevant experience, why you're a great fit, and your approach to this project..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        rows={5}
                        className="bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50 resize-none"
                      />
                      <p className="text-xs text-gray-600 mt-1">{coverLetter.length}/3000 characters</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApply}
                        disabled={isApplying}
                        className="font-semibold"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                      >
                        {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Submit Application
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowApplyForm(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isAuthenticated && job.status === "open" && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
                <p className="text-gray-300 mb-4">Sign in as a professional to apply for this job.</p>
                <a href={getLoginUrl()}>
                  <Button style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                    Sign In to Apply
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Job Details */}
            <div className="rounded-xl border border-white/8 bg-[#131a26] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Job Details</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-sm font-semibold text-white">${Number(job.budget).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-white">{job.location}</p>
                  </div>
                </div>

                {job.deadline && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="text-sm text-white">{new Date(job.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Posted</p>
                    <p className="text-sm text-white">{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Platform Guarantee</h3>
              <div className="space-y-2">
                {["Verified job posting", "Secure bidding process", "Dispute resolution support"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
