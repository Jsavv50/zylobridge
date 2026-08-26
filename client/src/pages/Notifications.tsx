import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNotificationRealtime } from "@/hooks/useNotificationRealtime";
import { Bell, CheckCircle2, ShieldAlert, Briefcase, MessageSquare, ArrowLeft, CreditCard, UserRound, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type NotificationRow = {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string | Date;
};

const PAGE_SIZE = 50;

function relativeTime(value: string | Date) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const utils = trpc.useUtils();

  const pageQuery = trpc.notifications.list.useQuery({ limit: PAGE_SIZE, offset }, {
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!pageQuery.data) return;
    const page = pageQuery.data as NotificationRow[];
    setHasMore(page.length === PAGE_SIZE);
    setItems((current) => {
      if (offset === 0) return page;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...page.filter((item) => !seen.has(item.id))];
    });
  }, [pageQuery.data, offset]);

  useNotificationRealtime(user?.id, (event) => {
    if (event.type === "sync") {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
      return;
    }
    const incoming = event.notification;
    if (!incoming || incoming.userId !== user?.id) return;
    setItems((current) => current.some((item) => item.id === incoming.id) ? current : [incoming, ...current]);
    utils.notifications.unreadCount.setData(undefined, (count) => (count ?? 0) + (incoming.isRead ? 0 : 1));
  });

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onMutate: ({ id }) => {
      setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
      utils.notifications.unreadCount.setData(undefined, (count) => Math.max(0, (count ?? 0) - 1));
    },
    onError: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
      toast.error("Unable to update notification");
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onMutate: () => {
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      utils.notifications.unreadCount.setData(undefined, () => 0);
    },
    onSuccess: () => toast.success("All notifications marked as read"),
    onError: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
      toast.error("Unable to mark notifications as read");
    },
  });

  const filteredNotifications = useMemo(
    () => filter === "unread" ? items.filter((item) => !item.isRead) : items,
    [filter, items],
  );

  const getNotificationHref = (notification: NotificationRow) => {
    if (!notification.referenceType || !notification.referenceId) return null;
    const id = encodeURIComponent(String(notification.referenceId));
    if (notification.referenceType === "conversation") return `/messages?conv=${id}`;
    if (notification.referenceType === "job" || notification.referenceType === "application") return `/jobs/${id}`;
    if (notification.referenceType === "escrow" || notification.referenceType === "engagement") return `/payments?jobId=${id}`;
    if (notification.referenceType === "verification") return "/admin/verifications";
    if (notification.referenceType === "user" || notification.referenceType === "profile") return `/profile/${id}`;
    return null;
  };

  const getIcon = (category: string) => {
    if (category === "job") return <Briefcase className="w-5 h-5 text-indigo-400" />;
    if (category === "message") return <MessageSquare className="w-5 h-5 text-blue-400" />;
    if (category === "verification" || category === "security") return <ShieldAlert className="w-5 h-5 text-emerald-400" />;
    if (category === "escrow" || category === "payment") return <CreditCard className="w-5 h-5 text-amber-400" />;
    if (category === "account") return <UserRound className="w-5 h-5 text-cyan-400" />;
    return <Bell className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-[#131a26]/80 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition shrink-0">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium hidden sm:inline">Back to Home</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate"><Bell className="w-5 h-5 text-purple-400 shrink-0" />Notifications</h1>
        </div>
        {user && unreadQuery.data !== undefined && unreadQuery.data > 0 && (
          <button onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition disabled:opacity-50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark all as read
          </button>
        )}
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1 bg-[#131a26] p-1 rounded-xl border border-white/10">
            <button onClick={() => setFilter("all")} className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition ${filter === "all" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>All ({items.length})</button>
            <button onClick={() => setFilter("unread")} className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition ${filter === "unread" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Unread ({unreadQuery.data ?? items.filter((item) => !item.isRead).length})</button>
          </div>
          <button onClick={() => { void pageQuery.refetch(); void unreadQuery.refetch(); }} className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition" aria-label="Refresh notifications"><RefreshCw className={`w-3.5 h-3.5 ${pageQuery.isFetching ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {!user ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-[#131a26]/60 p-8"><Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">Sign in to view notifications</h3><p className="text-sm text-gray-400 mb-6">Keep track of job matches, application updates, and messages.</p><Link href="/sign-in" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg hover:brightness-110 transition">Sign In Now</Link></div>
        ) : pageQuery.isLoading && items.length === 0 ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/10" />)}</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-[#131a26]/60 p-8"><Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-1">No notifications found</h3><p className="text-sm text-gray-400">You're all caught up! Check back later for updates.</p></div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const href = getNotificationHref(notification);
              const content = <><div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">{getIcon(notification.category)}</div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-3 mb-1"><h4 className={`text-sm font-semibold ${notification.isRead ? "text-gray-300" : "text-white"}`}>{notification.title}</h4><span className="text-xs text-gray-500 shrink-0">{relativeTime(notification.createdAt)}</span></div><p className="text-sm text-gray-400 leading-relaxed break-words">{notification.content}</p></div>{!notification.isRead && <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" aria-label="Unread" />}</>;
              const handleOpen = () => { if (!notification.isRead) markReadMutation.mutate({ id: notification.id }); if (href) setLocation(href); };
              return href ? <button type="button" key={notification.id} onClick={handleOpen} className={`group relative w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${notification.isRead ? "bg-[#131a26]/40 border-white/5 hover:border-white/10" : "bg-[#131a26] border-purple-500/30 shadow-lg shadow-purple-950/20 hover:border-purple-500/50"}`}>{content}</button> : <div key={notification.id} onClick={handleOpen} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleOpen(); }} className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${notification.isRead ? "bg-[#131a26]/40 border-white/5 hover:border-white/10" : "bg-[#131a26] border-purple-500/30 shadow-lg shadow-purple-950/20 hover:border-purple-500/50"}`}>{content}</div>;
            })}
            {hasMore && <button onClick={() => setOffset((current) => current + PAGE_SIZE)} disabled={pageQuery.isFetching} className="w-full py-3 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50">{pageQuery.isFetching ? "Loading…" : "Load more"}</button>}
          </div>
        )}
      </main>
    </div>
  );
}
