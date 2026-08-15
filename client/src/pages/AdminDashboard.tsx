import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Users, Briefcase, Shield, BarChart3,
  CheckCircle, Clock, AlertTriangle, Trash2,
  ChevronRight, Star, TrendingUp, Activity,
  ShieldCheck, CreditCard, Building2, CheckCircle2, XCircle, Eye, DollarSign
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VOCATION_LABELS, type VocationKey } from "@shared/vocations";

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

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "jobs" | "escrow" | "verification" | "analytics" | "products" | "orders" | "disputes" | "audit" | "reports">("overview");
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", currency: "NGN", category: "", stock: "-1" });
  const utils = trpc.useUtils();

  const { data: adminStats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN"),
  });
  const { data: allUsers, isLoading: usersLoading } = trpc.admin.listUsers.useQuery({}, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "users",
  });
  const { data: allJobs, isLoading: jobsLoading } = trpc.admin.listAllJobs.useQuery({ limit: 200 }, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "jobs",
  });
  const { data: allEscrow, isLoading: escrowLoading, refetch: refetchEscrow } = trpc.admin.listEscrow.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "escrow",
  });
  const { data: allVerifications, isLoading: verificationLoading, refetch: refetchVerifications } = trpc.verification.adminList.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "verification",
  });
  const { data: allProducts, isLoading: productsLoading, refetch: refetchProducts } = trpc.products.list.useQuery({ activeOnly: false }, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "products",
  });
  const { data: allOrders, isLoading: ordersLoading } = trpc.orders.all.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "orders",
  });
  const { data: allDisputes, isLoading: disputesLoading, refetch: refetchDisputes } = trpc.adminDisputes.list.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "disputes",
  });
  const { data: allAuditLogs, isLoading: auditLoading } = trpc.adminAudit.list.useQuery({ limit: 100 }, {
    enabled: !!user && user.role === "SUPER_ADMIN" && activeTab === "audit",
  });
  const { data: platformReports, isLoading: reportsLoading } = trpc.adminReports.get.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "SUPER_ADMIN") && activeTab === "reports",
  });

  const updateDisputeStatusMutation = trpc.adminDisputes.updateStatus.useMutation({
    onSuccess: () => { toast.success("Dispute status updated."); refetchDisputes(); },
    onError: (err) => toast.error(err.message),
  });
  const resolveDisputeMutation = trpc.adminDisputes.resolve.useMutation({
    onSuccess: () => { toast.success("Dispute resolved."); refetchDisputes(); },
    onError: (err) => toast.error(err.message),
  });
  const addDisputeNoteMutation = trpc.adminDisputes.addNote.useMutation({
    onSuccess: () => { toast.success("Administrative note added."); refetchDisputes(); },
    onError: (err) => toast.error(err.message),
  });

  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("Product created."); refetchProducts(); setShowProductForm(false); setProductForm({ name: "", description: "", price: "", currency: "NGN", category: "", stock: "-1" }); },
    onError: (err) => toast.error(err.message),
  });
  const toggleProductMutation = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Product updated."); refetchProducts(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success("Product deleted."); refetchProducts(); },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateUserRole } = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated.");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteJob } = trpc.admin.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job removed.");
      utils.admin.listAllJobs.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: confirmBankTransfer } = trpc.admin.confirmBankTransfer.useMutation({
    onSuccess: () => { toast.success("Bank transfer confirmed. Escrow funded."); refetchEscrow(); },
    onError: (e) => toast.error(e.message),
  });
  const { mutate: reviewVerification } = trpc.verification.adminReview.useMutation({
    onSuccess: () => { toast.success("Verification decision saved."); refetchVerifications(); utils.admin.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: updateJobStatus } = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Job status updated.");
      utils.admin.listAllJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── RBAC Guard ────────────────────────────────────────────────────────────
  // This page is completely hidden from non-admin users.
  // Non-admins are redirected to a 404-style screen with no admin UI exposed.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (user?.role !== "admin" && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
          <Shield className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          404 — Page Not Found
        </h1>
        <p className="text-gray-500 text-sm max-w-sm">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link href="/">
          <Button variant="outline" className="border-white/10 text-gray-400 bg-transparent mt-2">
            Return Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Shield className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Admin Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Platform management — restricted access</p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              user?.role === "SUPER_ADMIN"
                ? "text-red-300 bg-red-500/10 border-red-500/20"
                : "text-violet-300 bg-violet-500/10 border-violet-500/20"
            }`}>
              {user?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "ADMIN"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#131a26] rounded-xl p-1 w-fit border border-white/5 flex-wrap">
          {(["overview", "users", "jobs", "escrow", "verification", "products", "orders", "analytics", "disputes", "audit", "reports"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "audit" ? "Audit Logs" : tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : adminStats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users", value: adminStats.totalUsers, icon: Users, color: "violet", sub: `${adminStats.clientCount} clients, ${adminStats.professionalCount} pros` },
                    { label: "Total Jobs", value: adminStats.totalJobs, icon: Briefcase, color: "cyan", sub: `${adminStats.openJobs} open` },
                    { label: "Applications", value: adminStats.totalApplications, icon: Activity, color: "emerald", sub: `${adminStats.pendingApplications} pending` },
                    { label: "Completed Jobs", value: adminStats.completedJobs, icon: CheckCircle, color: "purple", sub: "all time" },
                  ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                      <div className={`h-9 w-9 rounded-lg bg-${color}-500/15 border border-${color}-500/25 flex items-center justify-center mb-3`}>
                        <Icon className={`h-4.5 w-4.5 text-${color}-400`} />
                      </div>
                      <p className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      <p className="text-xs text-gray-600 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Job Status Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <h3 className="font-semibold text-white mb-4">Job Status Breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Open", value: adminStats.openJobs, total: adminStats.totalJobs, color: "emerald" },
                        { label: "In Progress", value: adminStats.inProgressJobs, total: adminStats.totalJobs, color: "blue" },
                        { label: "Completed", value: adminStats.completedJobs, total: adminStats.totalJobs, color: "purple" },
                        { label: "Cancelled", value: adminStats.cancelledJobs, total: adminStats.totalJobs, color: "red" },
                      ].map(({ label, value, total, color }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${color}-500 rounded-full transition-all`}
                              style={{ width: total > 0 ? `${(value / total) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <h3 className="font-semibold text-white mb-4">User Breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Contractors / Clients", value: adminStats.clientCount, total: adminStats.totalUsers, color: "violet" },
                        { label: "Skilled Professionals", value: adminStats.professionalCount, total: adminStats.totalUsers, color: "cyan" },
                        { label: "Enterprise", value: adminStats.enterpriseCount, total: adminStats.totalUsers, color: "amber" },
                        { label: "Admins", value: adminStats.adminCount, total: adminStats.totalUsers, color: "amber" },
                        { label: "Unset / Onboarding", value: adminStats.unsetCount, total: adminStats.totalUsers, color: "gray" },
                      ].map(({ label, value, total, color }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${color}-500 rounded-full transition-all`}
                              style={{ width: total > 0 ? `${(value / total) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {usersLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : allUsers && allUsers.length > 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#131a26] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Joined</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u: any) => (
                        <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">{u.name ?? "—"}</p>
                              <p className="text-xs text-gray-500">{u.email ?? "—"}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              u.userType === "client" ? "bg-violet-500/15 text-violet-400 border-violet-500/25" :
                              u.userType === "professional" ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" :
                              u.userType === "enterprise" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                              "bg-gray-500/15 text-gray-400 border-gray-500/25"
                            }`}>
                              {u.userType === "client" ? "Contractor" : u.userType === "professional" ? "Professional" : u.userType === "enterprise" ? "Enterprise" : "Unset"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              u.role === "SUPER_ADMIN" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                              u.role === "admin" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                              "bg-gray-500/15 text-gray-400 border-gray-500/25"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            {u.id !== user?.id && user?.role === "SUPER_ADMIN" && (
                              <Select
                                value={u.role}
                                onValueChange={(role) => updateUserRole({ userId: u.id, role: role as "user" | "admin" | "SUPER_ADMIN" })}
                              >
                                <SelectTrigger className="w-[120px] h-7 text-xs bg-[#1c2740] border-white/10 text-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1c2740] border-white/10">
                                  <SelectItem value="user" className="text-xs text-gray-300">User</SelectItem>
                                  <SelectItem value="admin" className="text-xs text-gray-300">Admin</SelectItem>
                                  <SelectItem value="SUPER_ADMIN" className="text-xs text-gray-300">Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No users found.</p>
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div>
            {jobsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : allJobs && allJobs.length > 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#131a26] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Job</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Vocation</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Budget</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Posted</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allJobs.map((job: any) => (
                        <tr key={job.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-medium text-white line-clamp-1">{job.title}</p>
                              <p className="text-xs text-gray-500">{job.location}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">
                            {VOCATION_LABELS[job.vocation as VocationKey] ?? job.vocation}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-white">
                            ${Number(job.budget).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[job.status]}`}>
                              {STATUS_LABELS[job.status]}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Link href={`/jobs/${job.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-white border border-white/8">
                                  View
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Remove this job from the platform?")) {
                                    deleteJob({ id: job.id });
                                  }
                                }}
                                className="h-7 text-xs text-red-400 hover:text-red-300 border border-red-500/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Briefcase className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No jobs found.</p>
              </div>
            )}
          </div>
        )}

        {/* Escrow Tab */}
        {activeTab === "escrow" && (
          <div>
            {escrowLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : allEscrow && allEscrow.length > 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#131a26] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                  <h3 className="font-semibold text-white text-sm">Escrow Payments</h3>
                  <span className="ml-auto text-xs text-gray-500">{allEscrow.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Job</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Method</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEscrow.map((e: any) => (
                        <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-white">Job #{e.jobId}</p>
                            <p className="text-xs text-gray-500">Client #{e.clientId} → Pro #{e.professionalId}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-white">₦{Number(e.amount).toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                              {e.paymentMethod === "paystack" ? <CreditCard className="h-3.5 w-3.5 text-violet-400" /> : <Building2 className="h-3.5 w-3.5 text-cyan-400" />}
                              {e.paymentMethod === "paystack" ? "Paystack" : "Bank Transfer"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              e.status === "funded" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                              e.status === "released" ? "bg-purple-500/15 text-purple-400 border-purple-500/25" :
                              e.status === "refunded" ? "bg-blue-500/15 text-blue-400 border-blue-500/25" :
                              "bg-amber-500/15 text-amber-400 border-amber-500/25"
                            }`}>{e.status}</span>
                          </td>
                          <td className="px-5 py-4">
                            {e.paymentMethod === "bank_transfer" && e.status === "pending" && (
                              <div className="flex items-center gap-2">
                                {e.transferProofUrl && (
                                  <a href={e.transferProofUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-400 border border-cyan-500/20">
                                      <Eye className="h-3 w-3 mr-1" /> Proof
                                    </Button>
                                  </a>
                                )}
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => { if (confirm("Confirm bank transfer received?")) confirmBankTransfer({ jobId: e.jobId }); }}
                                  className="h-7 text-xs text-emerald-400 border border-emerald-500/20"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <CreditCard className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No escrow records yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === "verification" && (
          <div>
            {verificationLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : allVerifications && allVerifications.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold text-white text-sm">Verification Requests</h3>
                  <span className="ml-auto text-xs text-gray-500">
                    {allVerifications.filter((v: any) => v.status === "pending").length} pending
                  </span>
                </div>
                {allVerifications.map((v: any) => (
                  <div key={v.id} className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">User #{v.userId}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            v.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                            v.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                            "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          }`}>{v.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{v.documentType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-600 mt-1">{new Date(v.createdAt).toLocaleDateString()}</p>
                        {v.adminNote && (
                          <p className="text-xs text-gray-400 mt-2 bg-white/5 rounded-lg px-3 py-2">Note: {v.adminNote}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 text-xs text-cyan-400 border border-cyan-500/20"
                          onClick={async () => {
                            try {
                              const res = await utils.client.verification.adminGetDocumentUrl.query({ requestId: v.id });
                              if (res?.signedUrl) {
                                window.open(res.signedUrl, "_blank", "noopener,noreferrer");
                              } else {
                                toast.error("Could not generate document view URL");
                              }
                            } catch (err: any) {
                              toast.error(err.message || "Failed to load document");
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View Doc
                        </Button>
                        {v.status === "pending" && (
                          <>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => reviewVerification({ requestId: v.id, status: "approved" })}
                              className="h-8 text-xs text-emerald-400 border border-emerald-500/20"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => reviewVerification({ requestId: v.id, status: "rejected" })}
                              className="h-8 text-xs text-red-400 border border-red-500/20"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <ShieldCheck className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No verification requests yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : adminStats ? (
              <>
                {/* Platform-wide Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Jobs</span>
                      <Briefcase className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{(adminStats.openJobs ?? 0) + (adminStats.inProgressJobs ?? 0)}</div>
                    <p className="text-xs text-gray-400 mt-1">{adminStats.openJobs} open, {adminStats.inProgressJobs} in progress</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Platform Revenue</span>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">${Number((adminStats as any).fundedEscrowAmount ?? 0).toLocaleString()}</div>
                    <p className="text-xs text-gray-400 mt-1">Total escrow volume: ${(adminStats as any).totalEscrowAmount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Verification Queue</span>
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{(adminStats as any).pendingVerificationCount ?? 0}</div>
                    <p className="text-xs text-gray-400 mt-1">Pending review submissions</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Users</span>
                      <Users className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{adminStats.totalUsers}</div>
                    <p className="text-xs text-gray-400 mt-1">{adminStats.professionalCount} pros, {adminStats.clientCount} clients</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-violet-400" />
                      <h3 className="text-sm font-semibold text-white">Platform Health</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Job Fill Rate</span>
                        <span className="text-white font-medium">
                          {adminStats.totalJobs > 0
                            ? `${Math.round((adminStats.completedJobs / adminStats.totalJobs) * 100)}%`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg. Bids per Job</span>
                        <span className="text-white font-medium">
                          {adminStats.totalJobs > 0
                            ? (adminStats.totalApplications / adminStats.totalJobs).toFixed(1)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pro to Client Ratio</span>
                        <span className="text-white font-medium">
                          {adminStats.clientCount > 0
                            ? `${(adminStats.professionalCount / adminStats.clientCount).toFixed(1)}:1`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">Activity Summary</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Open Jobs</span>
                        <span className="text-emerald-400 font-medium">{adminStats.openJobs}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">In Progress</span>
                        <span className="text-blue-400 font-medium">{adminStats.inProgressJobs}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pending Applications</span>
                        <span className="text-yellow-400 font-medium">{adminStats.pendingApplications}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-[#131a26] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-white">Trust & Safety</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Verified Profiles</span>
                        <span className="text-white font-medium">{adminStats.verifiedUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Reviews</span>
                        <span className="text-white font-medium">{adminStats.totalReviews}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Admin Count</span>
                        <span className="text-amber-400 font-medium">{adminStats.adminCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Product Management</h2>
                  <Button onClick={() => setShowProductForm(!showProductForm)} className="bg-violet-600 hover:bg-violet-700 text-white">
                    {showProductForm ? "Cancel" : "+ Add Product"}
                  </Button>
                </div>
                {showProductForm && (
                  <div className="bg-[#131a26] border border-white/10 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-white">New Product</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                        <input className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} placeholder="Product name" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Price (NGN) *</label>
                        <input type="number" className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} placeholder="5000" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Category</label>
                        <input className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" value={productForm.category} onChange={e => setProductForm(p => ({...p, category: e.target.value}))} placeholder="e.g. Safety Gear" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Stock (-1 = unlimited)</label>
                        <input type="number" className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" value={productForm.stock} onChange={e => setProductForm(p => ({...p, stock: e.target.value}))} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">Description *</label>
                        <textarea rows={3} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none" value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} placeholder="Describe the product..." />
                      </div>
                    </div>
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white" disabled={createProductMutation.isPending} onClick={() => {
                      if (!productForm.name || !productForm.price || !productForm.description) { toast.error("Name, price, and description are required."); return; }
                      createProductMutation.mutate({ name: productForm.name, description: productForm.description, price: Number(productForm.price), currency: "NGN", category: productForm.category || undefined, stock: Number(productForm.stock) });
                    }}>
                      {createProductMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Product"}
                    </Button>
                  </div>
                )}
                {productsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
                ) : !allProducts || allProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No products yet. Add one above.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400">
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-left py-3 px-4">Category</th>
                          <th className="text-right py-3 px-4">Price</th>
                          <th className="text-center py-3 px-4">Stock</th>
                          <th className="text-center py-3 px-4">Status</th>
                          <th className="text-center py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProducts.map((p) => (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/2">
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{p.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{p.description}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-400">{p.category ?? "—"}</td>
                            <td className="py-3 px-4 text-right font-semibold text-violet-400">₦{Number(p.price).toLocaleString()}</td>
                            <td className="py-3 px-4 text-center text-gray-300">{p.stock === -1 ? "∞" : p.stock}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${p.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                                {p.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}>
                                  {p.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 text-xs h-7" onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProductMutation.mutate({ id: p.id }); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>
        )}
        {/* Disputes Tab */}
        {activeTab === "disputes" && (
          <div className="rounded-xl border border-white/8 bg-[#131a26] p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">Dispute Management</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              NOT IMPLEMENTED: Dedicated dispute arbitration workflows are not yet backed by the current escrow state machine. Existing escrow transactions can be reviewed under the Escrow tab.
            </p>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div className="rounded-xl border border-white/8 bg-[#131a26] p-8 text-center space-y-3">
            <Shield className="h-10 w-10 text-violet-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">Audit Logs</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              NOT IMPLEMENTED: Immutable administrative audit logging is scheduled for the upcoming release. All verification reviews and role updates are recorded directly in database metadata.
            </p>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="rounded-xl border border-white/8 bg-[#131a26] p-8 text-center space-y-3">
            <BarChart3 className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">Platform Reports</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              NOT IMPLEMENTED: Automated CSV/PDF report generation is not yet available. Real-time platform metrics and analytics are fully accessible under the Analytics tab.
            </p>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">All Orders</h2>
                {ordersLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
                ) : !allOrders || allOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400">
                          <th className="text-left py-3 px-4">Order ID</th>
                          <th className="text-left py-3 px-4">User</th>
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-right py-3 px-4">Amount</th>
                          <th className="text-center py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOrders.map((o: any) => (
                          <tr key={o.id} className="border-b border-white/5 hover:bg-white/2">
                            <td className="py-3 px-4 text-gray-400 font-mono text-xs">#{o.id}</td>
                            <td className="py-3 px-4 text-gray-300">User #{o.userId}</td>
                            <td className="py-3 px-4 text-gray-300">Product #{o.productId} × {o.quantity}</td>
                            <td className="py-3 px-4 text-right font-semibold text-violet-400">₦{Number(o.amount).toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                o.status === "paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                                o.status === "failed" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                                "bg-amber-500/15 text-amber-400 border-amber-500/25"
                              }`}>{o.status}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>
        )}
      </div>
    </div>
  );
}
