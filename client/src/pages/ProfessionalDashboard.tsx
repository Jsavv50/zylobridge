import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, User, Briefcase, CheckCircle, Clock, Star,
  MapPin, DollarSign, Edit3, Save, X, ArrowUpRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import JobCard from "@/components/JobCard";
import { VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { VerificationBadge } from "@/components/VerificationBadge";

const APP_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  accepted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected: "bg-red-500/15 text-red-400 border-red-500/25",
  withdrawn: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

export default function ProfessionalDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "browse" | "applications" | "profile">("overview");
  const [editingProfile, setEditingProfile] = useState(false);

  const utils = trpc.useUtils();
  const { data: profile, isLoading: profileLoading } = trpc.profiles.me.useQuery(undefined, {
    enabled: !!user && user.userType === "professional",
  });
  const { data: myApplications, isLoading: appsLoading } = trpc.applications.myApplications.useQuery(undefined, {
    enabled: !!user && user.userType === "professional",
  });
  const { data: openJobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery({ status: "open", limit: 20 }, {
    enabled: !!user && user.userType === "professional",
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    vocation: profile?.vocation ?? "",
    bio: profile?.bio ?? "",
    skills: profile?.skills ?? "",
    certifications: profile?.certifications ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    hourlyRate: profile?.hourlyRate ?? "",
    location: profile?.location ?? "",
    yearsExperience: profile?.yearsExperience?.toString() ?? "",
    isAvailable: profile?.isAvailable ?? true,
  });

  const { mutate: upsertProfile, isPending: savingProfile } = trpc.profiles.upsert.useMutation({
    onSuccess: () => {
      toast.success("Profile saved!");
      setEditingProfile(false);
      utils.profiles.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: withdrawApp } = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Application withdrawn.");
      utils.applications.myApplications.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-gray-400">Please sign in to access your dashboard.</p>
      </div>
    );
  }

  if (user?.userType !== "professional") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">This dashboard is for professionals only.</p>
        <Link href="/onboarding"><Button variant="outline" className="border-white/10 text-gray-400 bg-transparent">Set Up Profile</Button></Link>
      </div>
    );
  }

  const appStats = {
    total: myApplications?.length ?? 0,
    pending: myApplications?.filter((a) => a.status === "pending").length ?? 0,
    accepted: myApplications?.filter((a) => a.status === "accepted").length ?? 0,
  };

  const handleSaveProfile = () => {
    upsertProfile({
      vocation: profileForm.vocation || undefined,
      bio: profileForm.bio || undefined,
      skills: profileForm.skills || undefined,
      certifications: profileForm.certifications || undefined,
      portfolioUrl: profileForm.portfolioUrl || undefined,
      hourlyRate: profileForm.hourlyRate ? Number(profileForm.hourlyRate) : undefined,
      location: profileForm.location || undefined,
      yearsExperience: profileForm.yearsExperience ? Number(profileForm.yearsExperience) : undefined,
      isAvailable: profileForm.isAvailable,
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
              Professional Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {profile && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                profile.isAvailable
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                  : "bg-gray-500/15 text-gray-400 border-gray-500/25"
              }`}>
                {profile.isAvailable ? "Available" : "Unavailable"}
              </span>
            )}
            <VerificationBadge isVerified={!!user?.isVerified} size="md" showLabel />
            {!user?.isVerified && (
              <Link href="/verification">
                <Button size="sm" variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  Get Verified
                </Button>
              </Link>
            )}
            <Link href="/messages">
              <Button size="sm" variant="outline" className="text-xs border-white/10 text-gray-300">
                Messages
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#131a26] rounded-xl p-1 w-fit border border-white/5 flex-wrap">
          {(["overview", "browse", "applications", "profile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Total Applications", value: appStats.total, icon: Briefcase, color: "violet" },
                { label: "Pending", value: appStats.pending, icon: Clock, color: "yellow" },
                { label: "Accepted", value: appStats.accepted, icon: CheckCircle, color: "emerald" },
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

            {/* Profile Summary */}
            {profile ? (
              <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Your Profile</h3>
                  <button onClick={() => setActiveTab("profile")} className="text-xs text-violet-400 hover:text-violet-300">
                    Edit Profile →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vocation</p>
                    <p className="text-white font-medium">{VOCATION_LABELS[profile.vocation as VocationKey]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
                    <p className="text-white font-medium">{profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-white font-medium">{profile.location ?? "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rating</p>
                    <p className="text-white font-medium flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      {Number(profile.averageRating).toFixed(1)} ({profile.totalReviews} reviews)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
                <p className="text-gray-300 mb-3">Complete your profile to start applying for jobs.</p>
                <Button size="sm" onClick={() => setActiveTab("profile")}
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                  Set Up Profile
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Browse Jobs Tab */}
        {activeTab === "browse" && (
          <div>
            {jobsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : openJobs && openJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {openJobs.map((job) => (
                  <JobCard key={job.id} id={job.id} title={job.title} vocation={job.vocation}
                    location={job.location} budget={job.budget} status={job.status}
                    isUrgent={job.isUrgent} createdAt={job.createdAt} description={job.description} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">No open jobs available right now. Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div>
            {appsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : myApplications && myApplications.length > 0 ? (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div key={app.id} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Job #{app.jobId}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-violet-300">${Number(app.bidAmount).toLocaleString()}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${APP_STATUS_STYLES[app.status]}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-3">{app.coverLetter}</p>
                    <div className="flex gap-2">
                      <Link href={`/jobs/${app.jobId}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-gray-400 hover:text-white border border-white/8">
                          View Job
                        </Button>
                      </Link>
                      {app.status === "pending" && (
                        <Button size="sm" variant="ghost"
                          onClick={() => withdrawApp({ id: app.id, status: "withdrawn" })}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-500/20">
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Briefcase className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No applications yet. Browse jobs to get started.</p>
                <Button size="sm" onClick={() => setActiveTab("browse")}
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                  Browse Jobs
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="max-w-2xl">
            <div className="rounded-xl border border-white/8 bg-[#131a26] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Professional Profile</h3>
                {!editingProfile ? (
                  <Button size="sm" variant="ghost" onClick={() => {
                    setProfileForm({
                      vocation: profile?.vocation ?? "",
                      bio: profile?.bio ?? "",
                      skills: profile?.skills ?? "",
                      certifications: profile?.certifications ?? "",
                      portfolioUrl: profile?.portfolioUrl ?? "",
                      hourlyRate: profile?.hourlyRate ?? "",
                      location: profile?.location ?? "",
                      yearsExperience: profile?.yearsExperience?.toString() ?? "",
                      isAvailable: profile?.isAvailable ?? true,
                    });
                    setEditingProfile(true);
                  }}
                    className="text-violet-400 hover:text-violet-300 border border-violet-500/20">
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                      {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}
                      className="text-gray-400 hover:text-white border border-white/8">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Vocation *</Label>
                    <Select value={profileForm.vocation} onValueChange={(v) => setProfileForm({ ...profileForm, vocation: v })}>
                      <SelectTrigger className="mt-1.5 bg-[#1c2740] border-white/10 text-gray-300">
                        <SelectValue placeholder="Select your vocation" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1c2740] border-white/10">
                        {VOCATION_KEYS.map((key) => (
                          <SelectItem key={key} value={key} className="text-gray-300">
                            {VOCATION_LABELS[key as VocationKey]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Bio</Label>
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Tell clients about yourself and your experience..."
                      rows={3} className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600 resize-none" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Skills</Label>
                    <Input value={profileForm.skills} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                      placeholder="e.g. Residential wiring, Panel upgrades, Code compliance"
                      className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Certifications</Label>
                    <Input value={profileForm.certifications} onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                      placeholder="e.g. Master Electrician License, OSHA 30"
                      className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300 text-sm">Hourly Rate (USD)</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <Input type="number" value={profileForm.hourlyRate}
                          onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                          placeholder="75"
                          className="pl-7 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Years Experience</Label>
                      <Input type="number" value={profileForm.yearsExperience}
                        onChange={(e) => setProfileForm({ ...profileForm, yearsExperience: e.target.value })}
                        placeholder="5"
                        className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Location</Label>
                    <Input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                      placeholder="e.g. Houston, TX"
                      className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Portfolio URL</Label>
                    <Input value={profileForm.portfolioUrl} onChange={(e) => setProfileForm({ ...profileForm, portfolioUrl: e.target.value })}
                      placeholder="https://yourportfolio.com"
                      className="mt-1.5 bg-[#1c2740] border-white/10 text-white placeholder:text-gray-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="available" checked={profileForm.isAvailable}
                      onChange={(e) => setProfileForm({ ...profileForm, isAvailable: e.target.checked })}
                      className="h-4 w-4 rounded border-white/20 bg-[#1c2740] accent-violet-500" />
                    <Label htmlFor="available" className="text-gray-300 text-sm cursor-pointer">
                      Available for new work
                    </Label>
                  </div>
                </div>
              ) : profile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500 mb-1">Vocation</p><p className="text-sm text-white">{VOCATION_LABELS[profile.vocation as VocationKey]}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Hourly Rate</p><p className="text-sm text-white">{profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "—"}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Location</p><p className="text-sm text-white">{profile.location ?? "—"}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Experience</p><p className="text-sm text-white">{profile.yearsExperience ? `${profile.yearsExperience} years` : "—"}</p></div>
                  </div>
                  {profile.bio && <div><p className="text-xs text-gray-500 mb-1">Bio</p><p className="text-sm text-gray-300 leading-relaxed">{profile.bio}</p></div>}
                  {profile.skills && <div><p className="text-xs text-gray-500 mb-1">Skills</p><p className="text-sm text-gray-300">{profile.skills}</p></div>}
                  {profile.certifications && <div><p className="text-xs text-gray-500 mb-1">Certifications</p><p className="text-sm text-gray-300">{profile.certifications}</p></div>}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">No profile set up yet.</p>
                  <Button size="sm" onClick={() => setEditingProfile(true)}
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                    Create Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
