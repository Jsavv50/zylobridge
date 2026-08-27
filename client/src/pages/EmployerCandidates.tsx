import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { ApplicationShell, PageHeader, StatusBadge, EmptyState } from "../components/shell/ZyloShell";
import { Users, Briefcase, Mail, CheckCircle2, XCircle, ChevronRight, ShieldCheck, Star } from "lucide-react";
import { useRoute, useLocation } from "wouter";

export default function EmployerCandidates() {
  const [, params] = useRoute("/employer/jobs/:jobId/candidates");
  const [, setLocation] = useLocation();
  const jobId = Number(params?.jobId ?? 0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  const { data: applications = [], isLoading, refetch } = trpc.applications.listForJob.useQuery(
    { jobId, status: statusFilter },
    { enabled: jobId > 0 }
  );

  const updateStatusMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedCandidate(null);
    },
  });

  const tabs = [
    { id: "all", label: "All Applicants" },
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Accepted / Hired" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <ApplicationShell>
      <div className="space-y-6">
        <PageHeader
          title="Candidate Pipeline"
          description={`Review and manage applications submitted for Job #${jobId}.`}
        />

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Candidate List */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            title="No candidates in this view"
            description="No applications match the current filter criteria for this job posting."
            action={<button onClick={() => setLocation("/employer/jobs")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Back to Employer Jobs</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app: any) => {
              const prof = app.professional;
              const profile = app.profile;
              const badgeTone = app.status === "accepted" ? "success" : app.status === "rejected" ? "error" : "warning";

              return (
                <div key={app.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {prof?.name?.[0] ?? "P"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                            {prof?.name ?? `Professional #${app.professionalId}`}
                            {prof?.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" aria-label="Verified Professional" />}
                          </h4>
                          <p className="text-xs text-muted-foreground">{profile?.vocation ?? "Specialist"}</p>
                        </div>
                      </div>
                      <StatusBadge status={badgeTone} label={app.status} />
                    </div>

                    <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border/50 line-clamp-3">
                      <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider block mb-1">Cover Note</span>
                      {app.coverLetter}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>Bid: <strong className="text-foreground font-mono">₦{Number(app.bidAmount).toLocaleString()}</strong></span>
                      <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSelectedCandidate(app)}
                      className="px-3 py-1.5 border border-border hover:bg-muted rounded-lg text-xs font-medium transition-colors"
                    >
                      Review Profile
                    </button>
                    {app.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: app.id, status: "rejected" })}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: app.id, status: "accepted" })}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Candidate Detail Modal / Drawer */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{selectedCandidate.professional?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.profile?.vocation ?? "Specialist"}</p>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Professional Bio</h4>
                  <p className="text-muted-foreground">{selectedCandidate.profile?.bio ?? "No bio provided."}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-1">Skills & Expertise</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedCandidate.profile?.skills) ? (
                      selectedCandidate.profile.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-muted text-foreground text-xs font-medium">{skill}</span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No skills listed.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-1">Application Cover Letter</h4>
                  <p className="bg-muted/50 p-4 rounded-xl text-foreground/90 border border-border/50">{selectedCandidate.coverLetter}</p>
                </div>

                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                  <div>
                    <span className="text-xs text-muted-foreground block">Proposed Bid Amount</span>
                    <span className="text-lg font-bold font-mono text-primary">₦{Number(selectedCandidate.bidAmount).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Application Status</span>
                    <StatusBadge
                      status={selectedCandidate.status === "accepted" ? "success" : selectedCandidate.status === "rejected" ? "error" : "warning"}
                      label={selectedCandidate.status}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Close
                </button>
                {selectedCandidate.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: selectedCandidate.id, status: "rejected" })}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      Reject Candidate
                    </button>
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: selectedCandidate.id, status: "accepted" })}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Accept & Hire
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ApplicationShell>
  );
}
