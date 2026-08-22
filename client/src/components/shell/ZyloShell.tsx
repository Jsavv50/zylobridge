import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, Briefcase, Users, MessageSquare, Shield, Settings, 
  LogOut, Menu, X, Bell, ChevronRight, CheckCircle2, AlertTriangle, 
  Search, Building2, BarChart3, DollarSign 
} from "lucide-react";
import { useAuth } from "../../_core/hooks/useAuth";
import { ZylobridgeLogo } from "../ZylobridgeLogo";
import { trpc } from "../../lib/trpc";
import { useNotificationRealtime } from "../../hooks/useNotificationRealtime";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b border-border gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm md:text-base">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status, label }: { status: "success" | "warning" | "error" | "info" | "neutral"; label: string }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    error: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon = Briefcase, title, description, action }: { icon?: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border rounded-xl bg-card/50">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-6">{description}</p>
      {action}
    </div>
  );
}

export function ApplicationShell({ children, role = "user" }: { children: React.ReactNode; role?: "user" | "professional" | "employer" | "enterprise" | "admin" }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const notificationUtils = trpc.useUtils();
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!user });
  useNotificationRealtime(user?.id, (event) => {
    if (event.type === "sync") {
      void notificationUtils.notifications.unreadCount.invalidate();
      return;
    }
    if (event.notification && !event.notification.isRead && event.notification.userId === user?.id) {
      notificationUtils.notifications.unreadCount.setData(undefined, (count) => (count ?? 0) + 1);
    }
  });

  const resolvedRole = role !== "user"
    ? role
    : user?.role === "SUPER_ADMIN" || user?.role === "admin"
      ? "admin"
      : user?.userType === "professional"
        ? "professional"
        : user?.userType === "client"
          ? "employer"
          : user?.userType === "enterprise"
            ? "enterprise"
            : "user";

  const getNavItems = () => {
    if (resolvedRole === "admin" || user?.role === "admin" || user?.role === "SUPER_ADMIN") {
      return [
        { href: "/admin", label: "Admin Overview", icon: BarChart3 },
        { href: "/admin", label: "User Management", icon: Users },
        { href: "/admin", label: "Verification Queue", icon: Shield },
        { href: "/admin", label: "Dispute Arbitration", icon: AlertTriangle },
        { href: "/admin", label: "Audit Logs", icon: Settings },
      ];
    }
    if (resolvedRole === "professional") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/jobs", label: "Find Jobs", icon: Search },
        { href: "/applications", label: "Applications", icon: Briefcase },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/payments", label: "Earnings & Payouts", icon: DollarSign },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/profile", label: "Professional Profile", icon: Users },
      ];
    }
    if (resolvedRole === "employer" || resolvedRole === "enterprise") {
      return [
        { href: "/employer", label: "Employer Dashboard", icon: Home },
        { href: "/employer/jobs", label: "My Job Postings", icon: Briefcase },
        { href: "/talent", label: "Find Talent", icon: Search },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/enterprise", label: "Enterprise Org", icon: Building2 },
        { href: "/payments", label: "Escrow & Funding", icon: DollarSign },
        { href: "/notifications", label: "Notifications", icon: Bell },
      ];
    }
    return [
      { href: "/", label: "Home", icon: Home },
      { href: "/jobs", label: "Browse Jobs", icon: Search },
      { href: "/talent", label: "Browse Talent", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border h-16 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <ZylobridgeLogo />
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-foreground">{user.name || "User"}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role || user.userType || resolvedRole}</span>
              </div>
              <button 
                onClick={() => logout()}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary">Sign In</Link>
              <Link href="/sign-in" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90">Get Started</Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 sticky top-16 h-[calc(100vh-4rem)]">
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Notifications" && unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-border text-xs text-muted-foreground text-center">
            Zylobridge Global © 2026
          </div>
        </aside>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden flex flex-col pt-20 px-6">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Notifications" && unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
