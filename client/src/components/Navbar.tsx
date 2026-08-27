import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, ChevronDown, Briefcase, LayoutDashboard, Building2, Shield, MessageSquare, ShieldCheck, ShoppingBag, User, Bell } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ZylobridgeLogo } from "@/components/ZylobridgeLogo";
import { trpc } from "@/lib/trpc";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "SUPER_ADMIN";
  const isClient = user?.userType === "client";
  const isProfessional = user?.userType === "professional";
  const isEnterprise = user?.userType === "enterprise";

  const { data: unreadData } = trpc.messaging.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000, // poll every 30s
  });
  const messageUnreadCount = unreadData?.count ?? 0;
  const { data: notificationUnread = [] } = trpc.notifications.listUnread.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30_000 });
  const notificationUnreadCount = notificationUnread.length;

  const navLinks = [
    { href: "/jobs", label: "Browse Jobs" },
    { href: "/talent", label: "Find Professionals" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/enterprise", label: "Enterprise" },
    { href: "/shop", label: "Shop" },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0d1117]/90 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Canonical official logo; always returns to the homepage. */}
          <ZylobridgeLogo />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  location === link.href
                    ? "text-violet-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" aria-label={notificationUnreadCount ? `${notificationUnreadCount} unread notifications` : "Notifications"} className="relative rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white">
                  <Bell className="h-4 w-4" />
                  {notificationUnreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-violet-600 px-1 text-center text-[9px] font-bold leading-4 text-white">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>}
                </Link>
                {/* Dashboard link based on role */}
                {isAdmin && (
                  <Link href="/dashboard/admin">
                    <Button variant="ghost" size="sm" className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                      <Shield className="h-4 w-4 mr-1.5" />
                      Admin
                    </Button>
                  </Link>
                )}
                {isClient && (
                  <Link href="/dashboard/contractor">
                    <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/5">
                      <Briefcase className="h-4 w-4 mr-1.5" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                {isProfessional && (
                  <Link href="/dashboard/professional">
                    <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/5">
                      <LayoutDashboard className="h-4 w-4 mr-1.5" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                {isEnterprise && (
                  <Link href="/dashboard/enterprise">
                    <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/10">
                      <Building2 className="h-4 w-4 mr-1.5" />
                      Workspace
                    </Button>
                  </Link>
                )}
                {user?.userType === "unset" && (
                  <Link href="/onboarding">
                    <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                      Complete Profile
                    </Button>
                  </Link>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1 hover:border-violet-500/40 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-violet-600 text-white text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-300 max-w-[100px] truncate">{user?.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-[#131a26] border-white/10">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-xs text-gray-500">Signed in as</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <VerificationBadge isVerified={!!user?.isVerified} size="sm" />
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/messages" className="cursor-pointer text-gray-300 hover:text-white flex items-center gap-2 justify-between">
                        <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messages</span>
                        {messageUnreadCount > 0 && (
                          <span className="ml-auto bg-violet-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    {isProfessional && (
                      <DropdownMenuItem asChild>
                        <Link href="/verification" className="cursor-pointer text-gray-300 hover:text-white flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Get Verified
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/shop" className="cursor-pointer text-gray-300 hover:text-white flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" /> Shop
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer text-gray-300 hover:text-white flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" /> My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer text-gray-300 hover:text-white flex items-center gap-2">
                        <User className="h-4 w-4" /> My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => void handleLogout()}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/5">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button
                    size="sm"
                    className="font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                      border: "none",
                    }}
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0d1117] px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-gray-400 hover:text-white py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/5 space-y-2">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link href="/dashboard/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-violet-500/30 text-violet-400">
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                {isClient && (
                  <Link href="/dashboard/contractor" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-white/10 text-gray-300">
                      Client Dashboard
                    </Button>
                  </Link>
                )}
                {isProfessional && (
                  <Link href="/dashboard/professional" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-white/10 text-gray-300">
                      Professional Dashboard
                    </Button>
                  </Link>
                )}
                {isEnterprise && (
                  <Link href="/dashboard/enterprise" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-300">
                      <Building2 className="h-4 w-4 mr-2" /> Enterprise Workspace
                    </Button>
                  </Link>
                )}
                <Link href="/messages" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full border-white/10 text-gray-300">
                    <MessageSquare className="h-4 w-4 mr-2" /> Messages
                  </Button>
                </Link>
                <Link href="/notifications" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="relative w-full border-white/10 text-gray-300">
                    <Bell className="h-4 w-4 mr-2" /> Notifications {notificationUnreadCount > 0 ? `(${notificationUnreadCount > 99 ? "99+" : notificationUnreadCount})` : ""}
                  </Button>
                </Link>
                {isProfessional && (
                  <Link href="/verification" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-emerald-500/30 text-emerald-400">
                      <ShieldCheck className="h-4 w-4 mr-2" /> Get Verified
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300"
                  onClick={() => { void handleLogout(); setMobileOpen(false); }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="block" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full border-white/10 text-gray-300">Sign In</Button>
                </Link>
                <Link href="/sign-in" className="block" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
