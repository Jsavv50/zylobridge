import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { ApplicationShell, PageHeader, StatusBadge, EmptyState } from "../components/shell/ZyloShell";
import { Briefcase, Building2, MapPin, Calendar, Clock, ChevronRight, XCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function ProfessionalApplications() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: applications = [], isLoading, refetch } = trpc.applications.myApplications.useQuery({ status: statusFilter });
  const withdrawMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const tabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Submitted" },
    { id: "accepted", label: "Accepted" },
    { id: "rejected", label: "Rejected" },
    { id: "withdrawn", label: "Withdrawn" },
  ];

  return (
    <ApplicationShell>
      <div className="space-y-6">
        <PageHeader
          title="My Applications"
          description="Track your active submissions, employer reviews, and status updates across the Zylobridge marketplace."
        />

        {/* Status Tabs */}
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

        {/* Applications List */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications found"
            description={statusFilter === "all" ? "You haven't submitted any job applications yet. Explore available jobs to apply." : `No applications with status '${statusFilter}'.`}
            action={<button onClick={() => setLocation("/jobs")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Explore Jobs</button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((app: any) => {
              const statusVariant = app.status === "accepted" ? "success" : app.status === "rejected" ? "error" : app.status === "withdrawn" ? "muted" : "warning";
              const badgeTone = app.status === "accepted" ? "success" : app.status === "rejected" ? "error" : app.status === "withdrawn" ? "neutral" : "warning";
              return (
                <div key={app.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">App #{app.id}</span>
                      <StatusBadge status={badgeTone} label={app.status} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setLocation(`/jobs/${app.job?.id}`)}>
                      {app.job?.title ?? `Job #${app.jobId}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-primary" /> {app.employerName}</span>
                      {app.job?.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {app.job.location}</span>}
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-2 text-sm text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/50">
                      <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider block mb-1">Cover Note & Bid</span>
                      <p className="line-clamp-2">{app.coverLetter}</p>
                      <div className="mt-2 font-mono text-xs text-primary font-semibold">Bid: ₦{Number(app.bidAmount).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {app.status === "pending" && (
                      <button
                        onClick={() => withdrawMutation.mutate({ id: app.id, status: "withdrawn" })}
                        disabled={withdrawMutation.isPending}
                        className="px-4 py-2 border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Withdraw
                      </button>
                    )}
                    <button
                      onClick={() => setLocation(`/jobs/${app.job?.id}`)}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      View Job <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ApplicationShell>
  );
}
