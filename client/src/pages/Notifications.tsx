import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, CheckCircle2, ShieldAlert, Briefcase, MessageSquare, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(undefined, {
    enabled: !!user,
  });

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      utils.notifications.list.invalidate();
    },
  });

  const filteredNotifications = notifications.filter((n: any) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="w-5 h-5 text-indigo-400" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case "verification":
        return <ShieldAlert className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-[#131a26]/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            Notifications
          </h1>
        </div>
        {user && notifications.length > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Mark all as read
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-[#131a26] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === "all" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === "unread" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              Unread ({notifications.filter((n: any) => !n.isRead).length})
            </button>
          </div>
        </div>

        {!user ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-[#131a26]/60 p-8">
            <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Sign in to view notifications</h3>
            <p className="text-sm text-gray-400 mb-6">Keep track of job matches, application updates, and messages.</p>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg hover:brightness-110 transition"
            >
              Sign In Now
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-[#131a26]/60 p-8">
            <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No notifications found</h3>
            <p className="text-sm text-gray-400">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) {
                    markReadMutation.mutate({ id: n.id });
                  }
                }}
                className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${
                  n.isRead
                    ? "bg-[#131a26]/40 border-white/5 hover:border-white/10"
                    : "bg-[#131a26] border-purple-500/30 shadow-lg shadow-purple-950/20 hover:border-purple-500/50"
                }`}
              >
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  {getIcon(n.category || n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-semibold truncate ${n.isRead ? "text-gray-300" : "text-white"}`}>
                      {n.title}
                    </h4>
                    <span className="text-xs text-gray-500 shrink-0">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{n.content || n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
