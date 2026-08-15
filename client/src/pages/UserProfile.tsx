import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  LogOut,
  Settings,
  Briefcase,
  Calendar,
  Clock,
  ChevronRight,
  Edit3,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Star,
  MessageSquare,
  ShoppingBag,
  LayoutDashboard,
  Building2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color = "violet",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: "violet" | "emerald" | "blue" | "amber";
}) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <div className="rounded-2xl border border-white/8 bg-[#131a26]/60 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-white mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  copyable = false,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  badge?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    });
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/6 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-white font-medium truncate">{value || "Not set"}</p>
          {badge}
        </div>
      </div>
      {copyable && value && (
        <button
          onClick={handleCopy}
          className="shrink-0 p-1.5 rounded-lg hover:bg-white/8 transition-colors text-gray-500 hover:text-gray-300"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  accent = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`group rounded-2xl border p-5 cursor-pointer transition-all duration-200 hover:border-violet-500/40 hover:bg-white/4 ${
          accent
            ? "border-violet-500/30 bg-violet-500/5"
            : "border-white/8 bg-[#131a26]/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-violet-400" />
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors mt-1 shrink-0" />
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/sign-in",
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      navigate("/");
      toast.success("You have been signed out.");
    },
    onError: () => {
      toast.error("Sign out failed. Please try again.");
    },
  });

  const handleSignOut = () => {
    logoutMutation.mutate();
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto" />
            <p className="text-gray-400 text-sm">Loading your profile…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Unauthenticated guard (redirect handled by useAuth) ────────────────────
  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = getInitials(user.name);
  const roleLabel = user.role === "SUPER_ADMIN" ? "Super Administrator" : user.role === "admin" ? "Administrator" : "Member";
  const userTypeLabel =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.userType === "professional"
      ? "Trade Professional"
      : user.userType === "client"
      ? "Client / Contractor"
      : user.userType === "enterprise"
      ? "Enterprise"
      : "Account not configured";
  const loginMethodLabel =
    user.loginMethod === "google"
      ? "Google"
      : user.loginMethod === "email"
      ? "Email OTP"
      : user.loginMethod === "phone"
      ? "Phone OTP"
      : user.loginMethod || "Unknown";

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-300 font-medium">My Profile</span>
          </nav>

          {/* ── Profile Hero ───────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#131a26] to-[#0d1320] overflow-hidden">
            {/* Banner */}
            <div
              className="h-32 w-full"
              style={{
                background:
                  "linear-gradient(135deg, #1e0a3c 0%, #0d1a3a 40%, #0a1628 100%)",
              }}
            >
              <div className="h-full w-full opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 50%, #7c3aed33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #2563eb22 0%, transparent 50%)",
                }}
              />
            </div>

            {/* Avatar + info */}
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
                <div className="flex items-end gap-4">
                  <Avatar className="w-20 h-20 border-4 border-[#0a0f1a] shadow-xl">
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-blue-600 text-white text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-white">{user.name || "Anonymous User"}</h1>
                      {user.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {user.role === "SUPER_ADMIN" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                          <Shield className="h-3 w-3" /> Super Admin
                        </span>
                      )}
                      {user.role === "admin" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{userTypeLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-1">
                  <Link href="/profile/edit">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 text-gray-300 hover:text-white hover:border-white/20 bg-transparent gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 bg-transparent gap-1.5"
                    onClick={handleSignOut}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {logoutMutation.isPending ? "Signing out…" : "Sign Out"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={user.isVerified ? ShieldCheck : Shield}
              label="Verification"
              value={user.isVerified ? "Verified" : "Unverified"}
              color={user.isVerified ? "emerald" : "amber"}
            />
            <StatCard
              icon={Briefcase}
              label="Account Type"
              value={userTypeLabel}
              color="violet"
            />
            <StatCard
              icon={Calendar}
              label="Member Since"
              value={formatDate(user.createdAt)}
              color="blue"
            />
            <StatCard
              icon={Clock}
              label="Last Sign-In"
              value={formatRelativeTime(user.lastSignedIn)}
              color="violet"
            />
          </div>

          {/* ── Two-column layout ─────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Left — Account Details */}
            <div className="lg:col-span-2 space-y-6">

              {/* Account Information */}
              <section className="rounded-2xl border border-white/8 bg-[#131a26]/60 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-400" />
                    Account Information
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-xs border-white/10 text-gray-400 bg-white/4"
                  >
                    {roleLabel}
                  </Badge>
                </div>
                <Separator className="bg-white/6 mb-4" />

                <InfoRow
                  icon={User}
                  label="Full Name"
                  value={user.name}
                  copyable
                />
                <InfoRow
                  icon={Mail}
                  label="Email Address"
                  value={user.email}
                  copyable
                  badge={
                    user.email ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                        <CheckCircle className="h-2.5 w-2.5" /> Confirmed
                      </span>
                    ) : undefined
                  }
                />
                <InfoRow
                  icon={Phone}
                  label="Phone Number"
                  value={user.phone}
                  copyable={!!user.phone}
                  badge={
                    !user.phone ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 rounded-full px-1.5 py-0.5">
                        <AlertCircle className="h-2.5 w-2.5" /> Not added
                      </span>
                    ) : undefined
                  }
                />
                <InfoRow
                  icon={Lock}
                  label="Sign-In Method"
                  value={loginMethodLabel}
                />
                <InfoRow
                  icon={Shield}
                  label="Account Role"
                  value={roleLabel}
                />
              </section>

              {/* Verification Status */}
              <section className="rounded-2xl border border-white/8 bg-[#131a26]/60 p-6">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-violet-400" />
                  Verification Status
                </h2>
                <Separator className="bg-white/6 mb-4" />

                {user.isVerified ? (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">Identity Verified</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5 leading-relaxed">
                        Your account has been verified. You have full access to all ZYLOBRIDGE features including job applications, escrow payments, and professional listings.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-300">Verification Pending</p>
                        <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
                          Complete identity verification to unlock job applications, escrow payments, and professional listings on ZYLOBRIDGE.
                        </p>
                      </div>
                    </div>
                    {user.userType === "professional" && (
                      <Link href="/verification">
                        <Button
                          size="sm"
                          className="w-full font-semibold"
                          style={{
                            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                          }}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Start Verification
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </section>

              {/* Account Type Setup */}
              {user.userType === "unset" && (
                <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-violet-400" />
                    Complete Your Setup
                  </h2>
                  <Separator className="bg-white/6 mb-4" />
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    Your account type has not been configured yet. Choose whether you are joining as a trade professional or a client/contractor to unlock the full ZYLOBRIDGE experience.
                  </p>
                  <Link href="/onboarding">
                    <Button
                      size="sm"
                      className="font-semibold"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                      }}
                    >
                      Complete Onboarding
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </section>
              )}
            </div>

            {/* Right — Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white px-1">Quick Actions</h2>

              <QuickActionCard
                icon={Briefcase}
                title="Browse Jobs"
                description="Find and apply to available trade jobs in your area."
                href="/jobs"
              />
              <QuickActionCard
                icon={MessageSquare}
                title="Messages"
                description="View your conversations with clients and professionals."
                href="/messages"
              />
              <QuickActionCard
                icon={ShoppingBag}
                title="Shop"
                description="Browse tools, equipment, and supplies in the marketplace."
                href="/shop"
              />
              {user.userType === "professional" && (
                <QuickActionCard
                  icon={Star}
                  title="My Applications"
                  description="Track the status of your job applications."
                  href="/my-applications"
                />
              )}
              {user.userType === "client" && (
                <QuickActionCard
                  icon={LayoutDashboard}
                  title="My Jobs"
                  description="Manage the jobs you have posted on the platform."
                  href="/my-jobs"
                  accent
                />
              )}
              {user.userType === "enterprise" && (
                <QuickActionCard
                  icon={Building2}
                  title="Enterprise Workspace"
                  description="Open your organization workspace and account tools."
                  href="/dashboard/enterprise"
                  accent
                />
              )}
              {(user.role === "admin" || user.role === "SUPER_ADMIN") && (
                <QuickActionCard
                  icon={Shield}
                  title="Admin Dashboard"
                  description="Access super administrator controls, verification queues, and platform management."
                  href="/dashboard/admin"
                  accent
                />
              )}

              {/* Account Metadata */}
              <div className="rounded-2xl border border-white/8 bg-[#131a26]/60 p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Account ID</span>
                    <span className="text-xs text-gray-300 font-mono">#{user.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Created</span>
                    <span className="text-xs text-gray-300">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Last active</span>
                    <span className="text-xs text-gray-300">{formatRelativeTime(user.lastSignedIn)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Sign-in method</span>
                    <span className="text-xs text-gray-300">{loginMethodLabel}</span>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <Button
                variant="outline"
                className="w-full border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 bg-transparent gap-2"
                onClick={handleSignOut}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
                {logoutMutation.isPending ? "Signing out…" : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
